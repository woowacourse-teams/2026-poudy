package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.FeedbackImageFormat;
import com.poudy.feedback.domain.image.PendingImage;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.service.FeedbackImageTransferService;
import com.poudy.feedback.service.FeedbackImageTransferService.TransferCounts;
import com.poudy.feedback.service.FeedbackRetentionService;
import com.zaxxer.hikari.HikariDataSource;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.profiles.include=prod",
        "POUDY_DB_URL=${POUDY_TEST_DB_URL:jdbc:postgresql://localhost:5432/poudy_test}",
        "POUDY_DB_STATEMENT_TIMEOUT_MS=1000",
        "spring.datasource.hikari.maximum-pool-size=2",
        "spring.datasource.hikari.minimum-idle=0",
        "poudy.feedback.image-transfer.enabled=false",
        "poudy.feedback.retention.enabled=false"
})
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("1초 SQL 상한에서 정상 조회와 데이터가 있는 정리 배치")
class DatabaseStatementTimeoutWorkloadTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-30T06:07:00Z"), ZoneId.of("Asia/Seoul"));

    @DynamicPropertySource
    static void databaseCredentials(DynamicPropertyRegistry properties) {
        properties.add("POUDY_DB_USERNAME", () -> System.getenv().getOrDefault("POUDY_DB_USERNAME", "postgres"));
        properties.add("POUDY_DB_PASSWORD", () -> System.getenv().getOrDefault("POUDY_DB_PASSWORD", ""));
    }

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private NamedParameterJdbcTemplate namedJdbc;

    @Autowired
    private FeedbackRepository feedbacks;

    @Autowired
    private HikariDataSource dataSource;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("후보 상한이 실제 연결에 적용되고 정상 검색·필터·상세 요청을 처리한다")
    void handlesNormalCatalogRequests() throws Exception {
        assertThat(jdbc.queryForObject("show statement_timeout", String.class)).isEqualTo("1s");
        Long product = jdbc.queryForObject("select min(id) from product", Long.class);
        Long ingredient = jdbc.queryForObject("select min(id) from ingredient", Long.class);
        for (String path : List.of(
            "/api/products?size=20",
            "/api/products?size=20&keyword=토너",
            "/api/products?size=20&includeIngredientIds=" + ingredient,
            "/api/products/count?keyword=토너",
            "/api/products/suggestions?keyword=토너",
            "/api/products/" + product,
            "/api/ingredients?keyword=글리세린",
            "/api/ingredients/" + ingredient
        )) {
            mockMvc.perform(get(path)).andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("실제 DB의 이미지 귀속 조회와 500건 경계를 넘는 보유기간 정리가 완료된다")
    void completesPopulatedFeedbackBatches() throws Exception {
        List<UUID> ids = new ArrayList<>();
        S3FeedbackImageRepository images = mock(S3FeedbackImageRepository.class);
        LocalDateTime now = LocalDateTime.now(CLOCK);
        try {
            ids.addAll(insertFeedbacks(250, now.minusDays(84)));
            ids.addAll(insertCorrections(251, now.minusDays(84)));
            List<UUID> recent = new ArrayList<>(insertFeedbacks(1, now));
            ids.addAll(recent);
            List<UUID> recentCorrections = insertCorrections(1, now);
            recent.addAll(recentCorrections);
            ids.addAll(recentCorrections);
            MapSqlParameterSource parameters = new MapSqlParameterSource("ids", ids);
            namedJdbc.update("""
                insert into feedback_image (image_id, feedback_id, display_order)
                select gen_random_uuid(), id, 0 from feedback where id in (:ids)
                """, parameters);
            namedJdbc.update("""
                insert into product_correction_request_image (image_id, request_id, display_order)
                select gen_random_uuid(), id, 0 from product_correction_request where id in (:ids)
                """, parameters);
            List<PendingImage> pending = new ArrayList<>(
                namedJdbc.query(
                    """
                        select image_id from feedback_image where feedback_id in (:ids)
                        union all
                        select image_id from product_correction_request_image where request_id in (:ids)
                        """,
                    parameters,
                    (rs, row) -> new PendingImage(
                        new FeedbackImage(rs.getObject("image_id", UUID.class), FeedbackImageFormat.JPEG),
                        "test-etag",
                        CLOCK.instant().minus(Duration.ofDays(2))
                    )
                )
            );
            PendingImage orphan = new PendingImage(
                FeedbackImage.create(FeedbackImageFormat.JPEG),
                "test-etag",
                CLOCK.instant().minus(Duration.ofDays(2))
            );
            pending.add(orphan);
            given(images.findAllPending()).willReturn(pending);
            given(images.transfer(any(), any())).willReturn(true);

            TransferCounts counts = new FeedbackImageTransferService(feedbacks, images, CLOCK, true)
                .transferPending(CLOCK.instant());
            assertThat(counts).isEqualTo(new TransferCounts(503, 0, 1));
            verify(images, times(503)).transfer(any(), any());
            verify(images).deletePending(orphan.image());

            new FeedbackRetentionService(feedbacks, images, CLOCK, Duration.ofDays(83), 500, 20).purgeExpired();
            verify(images, times(501)).deleteRetainedData(any());
            assertThat(feedbacks.findExpiredIds(java.time.OffsetDateTime.now(CLOCK).minusDays(83), 500)).isEmpty();
            assertThat(namedJdbc.queryForList("""
                select id from feedback where id in (:ids)
                union all select id from product_correction_request where id in (:ids)
                """, parameters, UUID.class)).containsExactlyInAnyOrderElementsOf(recent);
            assertThat(namedJdbc.queryForObject("""
                select (select count(*) from feedback_image where feedback_id in (:ids))
                     + (select count(*) from product_correction_request_image where request_id in (:ids))
                """, parameters, Long.class)).isEqualTo(2L);
            assertThat(dataSource.getHikariPoolMXBean().getActiveConnections()).isZero();
            mockMvc.perform(get("/api/categories")).andExpect(status().isOk());
        } finally {
            if (!ids.isEmpty()) {
                MapSqlParameterSource parameters = new MapSqlParameterSource("ids", ids);
                namedJdbc.update("delete from feedback where id in (:ids)", parameters);
                namedJdbc.update("delete from product_correction_request where id in (:ids)", parameters);
            }
        }
    }

    private List<UUID> insertFeedbacks(int count, LocalDateTime createdAt) {
        return jdbc.queryForList("""
            insert into feedback (id, subject_type, content, created_at, status_changed_at)
            select gen_random_uuid(), 'OTHER', 'timeout workload', ?, ? from generate_series(1, ?)
            returning id
            """, UUID.class, createdAt, createdAt, count);
    }

    private List<UUID> insertCorrections(int count, LocalDateTime createdAt) {
        return jdbc.queryForList("""
            insert into product_correction_request (id, product_id, content, created_at, status_changed_at)
            select gen_random_uuid(), (select min(id) from product), 'timeout workload', ?, ?
            from generate_series(1, ?) returning id
            """, UUID.class, createdAt, createdAt, count);
    }
}
