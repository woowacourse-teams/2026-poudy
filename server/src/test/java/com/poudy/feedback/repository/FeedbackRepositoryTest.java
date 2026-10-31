package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.InvalidImageIdException;
import com.poudy.image.domain.PendingImage;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.product.repository.ProductRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("의견 저장소")
class FeedbackRepositoryTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-10T01:02:03.456Z"), SEOUL);
    private static final OffsetDateTime RECEIVED_AT = OffsetDateTime.now(CLOCK);

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private NamedParameterJdbcTemplate namedJdbc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PendingImageRepository pendingImageRepository;

    private FeedbackRepository repository;

    @BeforeEach
    void setUp() {
        repository = new FeedbackRepository(
            pendingImageRepository,
            namedJdbc,
            transactionManager,
            productRepository,
            CLOCK
        );
    }

    @Test
    @DisplayName("서비스 의견을 저장하고 접수 시각의 시간대까지 같은 값으로 읽는다")
    void roundTripsServiceFeedback() {
        Feedback feedback = serviceFeedback(FeedbackType.BUG_REPORT, "/products/1", RECEIVED_AT);

        repository.save(feedback);

        assertThat(repository.findById(feedback.id())).isEqualTo(feedback);
        assertThat(repository.findById(feedback.id()).receivedAt().getOffset()).isEqualTo(RECEIVED_AT.getOffset());
    }

    @Test
    @DisplayName("UTC 시계로 접수한 의견도 같은 순간의 한국 시각으로 읽는다")
    void readsUtcReceivedAtAsSameInstant() {
        OffsetDateTime receivedAt = OffsetDateTime.parse("2026-09-10T01:02:03Z");
        Feedback feedback = serviceFeedback(FeedbackType.BUG_REPORT, "/products/1", receivedAt);

        repository.save(feedback);

        assertThat(repository.findById(feedback.id()).receivedAt())
            .isEqualTo(OffsetDateTime.parse("2026-09-10T10:02:03+09:00"));
    }

    @Test
    @DisplayName("화면 경로가 없는 의견을 저장한다")
    void storesUnknownPath() {
        Feedback feedback = serviceFeedback(FeedbackType.OTHER, null, RECEIVED_AT);

        repository.save(feedback);

        assertThat(repository.findById(feedback.id())).isEqualTo(feedback);
    }

    @Test
    @DisplayName("제품 정보 정정 요청은 대상 제품과 함께 따로 저장한다")
    void roundTripsProductCorrection() {
        Feedback correction = new ProductCorrection(
            UUID.randomUUID(),
            1L,
            "블랙 스네일 토너",
            new FeedbackContent("표시된 용량이 실제 제품과 달라요"),
            RECEIVED_AT
        );

        repository.save(correction);

        assertThat(repository.findById(correction.id())).isEqualTo(correction);
        assertThat(rowCount("product_correction_request", correction.id())).isOne();
        assertThat(rowCount("feedback", correction.id())).isZero();
    }

    @Test
    @DisplayName("임시 이미지를 차지해 순서대로 의견과 함께 저장하고 이미지의 소유 의견을 찾는다")
    void storesImagesWithFeedback() {
        UUID first = givenPending(CLOCK.instant());
        UUID second = givenPending(CLOCK.instant());
        Feedback feedback = serviceFeedback(FeedbackType.IMPROVEMENT, null, RECEIVED_AT);

        repository.save(feedback.attachImages(List.of(second, first)));

        assertThat(repository.findById(feedback.id()).imageIds()).containsExactly(second, first);
        assertThat(repository.findImageIds(feedback.id())).containsExactly(second, first);
        assertThat(repository.hasImage(feedback.id(), first)).isTrue();
        assertThat(repository.hasImage(feedback.id(), UUID.randomUUID())).isFalse();
        assertThat(repository.hasImage(UUID.randomUUID(), first)).isFalse();
        assertThat(pendingCount(first, second)).isZero();
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("만료됐거나 없는 임시 이미지가 하나라도 있으면 거절하고 나머지 임시 이미지도 그대로 둔다")
    void rejectsExpiredOrUnknownImage() {
        UUID valid = givenPending(CLOCK.instant());
        UUID expired = givenPending(PendingImage.claimableSince(CLOCK.instant()));
        Feedback feedback = serviceFeedback(FeedbackType.OTHER, null, RECEIVED_AT);
        try {
            assertThatThrownBy(() -> repository.save(feedback.attachImages(List.of(valid, expired))))
                .isInstanceOf(InvalidImageIdException.class);
            assertThatThrownBy(() -> repository.save(feedback.attachImages(List.of(valid, UUID.randomUUID()))))
                .isInstanceOf(InvalidImageIdException.class);

            assertThat(repository.exists(feedback.id())).isFalse();
            assertThat(pendingCount(valid, expired)).isEqualTo(2);
        } finally {
            namedJdbc.update("delete from pending_image where id in (:ids)", Map.of("ids", List.of(valid, expired)));
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("의견 행 저장이 확정 실패하면 인프라 오류로 알린다")
    void reportsDefiniteFailure() {
        Feedback correction = new ProductCorrection(
            UUID.randomUUID(),
            999_999L,
            "없는 제품",
            new FeedbackContent("전성분 정보를 정정해 주세요"),
            RECEIVED_AT
        );

        assertThatThrownBy(() -> repository.save(correction))
            .isInstanceOf(InfrastructureException.class);
        assertThat(repository.exists(correction.id())).isFalse();
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("같은 이미지 ID를 서비스 의견과 정정 요청에 동시에 보내면 한쪽만 저장한다")
    void acceptsOnlyOneConcurrentUseOfImage() throws Exception {
        List<UUID> savedIds = new java.util.concurrent.CopyOnWriteArrayList<>();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Integer> successes = java.util.stream.IntStream.range(0, 20)
                .mapToObj(round -> successesOfConcurrentPair(executor, givenPending(CLOCK.instant()), savedIds))
                .toList();

            assertThat(successes).containsOnly(1);
        } finally {
            executor.shutdownNow();
            savedIds.forEach(id -> {
                jdbcTemplate.update("delete from feedback where id = ?", id);
                jdbcTemplate.update("delete from product_correction_request where id = ?", id);
            });
        }
    }

    private int successesOfConcurrentPair(ExecutorService executor, UUID imageId, List<UUID> savedIds) {
        Feedback service = serviceFeedback(FeedbackType.OTHER, null, RECEIVED_AT);
        Feedback correction = new ProductCorrection(
            UUID.randomUUID(),
            1L,
            "블랙 스네일 토너",
            new FeedbackContent("전성분 정보를 정정해 주세요"),
            RECEIVED_AT
        );
        savedIds.add(service.id());
        savedIds.add(correction.id());
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = Stream.of(service, correction)
            .map(feedback -> executor.submit(() -> {
                start.await();
                try {
                    repository.save(feedback.attachImages(List.of(imageId)));
                    return true;
                } catch (InvalidImageIdException exception) {
                    return false;
                }
            }))
            .toList();
        start.countDown();
        return (int) results.stream().filter(FeedbackRepositoryTest::succeeded).count();
    }

    private static boolean succeeded(Future<Boolean> result) {
        try {
            return result.get();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private UUID givenPending(Instant createdAt) {
        UUID id = UUID.randomUUID();
        pendingImageRepository.save(new PendingImage(id, ImagePurpose.FEEDBACK), createdAt);
        return id;
    }

    private long pendingCount(UUID... ids) {
        return namedJdbc.queryForObject(
            "select count(*) from pending_image where id in (:ids)",
            Map.of("ids", List.of(ids)),
            Long.class
        );
    }

    @Test
    @DisplayName("상태 변경을 저장하고 완료 시각을 함께 남긴다")
    void updatesStatus() {
        Feedback feedback = serviceFeedback(FeedbackType.BUG_REPORT, null, RECEIVED_AT);
        repository.save(feedback);
        Clock later = Clock.fixed(Instant.parse("2026-09-11T00:00:00Z"), SEOUL);

        Feedback completed = feedback.changeStatus(FeedbackStatus.COMPLETED, later);
        assertThat(repository.updateStatus(FeedbackStatus.RECEIVED, completed)).isTrue();

        assertThat(repository.findById(feedback.id())).isEqualTo(completed);
    }

    @Test
    @DisplayName("읽은 뒤 상태가 바뀌었으면 상태 변경을 저장하지 않는다")
    void rejectsStaleStatusChange() {
        Feedback feedback = serviceFeedback(FeedbackType.BUG_REPORT, null, RECEIVED_AT);
        repository.save(feedback);
        Clock later = Clock.fixed(Instant.parse("2026-09-11T00:00:00Z"), SEOUL);
        repository.updateStatus(FeedbackStatus.RECEIVED, feedback.changeStatus(FeedbackStatus.IN_PROGRESS, later));

        boolean updated = repository.updateStatus(
            FeedbackStatus.RECEIVED,
            feedback.changeStatus(FeedbackStatus.COMPLETED, later)
        );

        assertThat(updated).isFalse();
        assertThat(repository.findById(feedback.id()).status()).isEqualTo(FeedbackStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("목록은 두 종류를 합쳐 최근 접수부터 돌려주고 상태와 유형으로 거른다")
    void listsBothKindsNewestFirst() {
        Feedback older = serviceFeedback(FeedbackType.BUG_REPORT, null, RECEIVED_AT);
        Feedback newer = new ProductCorrection(
            UUID.randomUUID(),
            1L,
            "블랙 스네일 토너",
            new FeedbackContent("전성분 순서가 실제와 달라요"),
            RECEIVED_AT.plusHours(1)
        );
        repository.save(older);
        repository.save(newer);

        assertThat(repository.findPage(null, null, 0, 100)).extracting(Feedback::id)
            .containsSubsequence(newer.id(), older.id());
        assertThat(repository.findPage(null, FeedbackSubjectType.PRODUCT_CORRECTION, 0, 100)).extracting(Feedback::id)
            .contains(newer.id())
            .doesNotContain(older.id());
        assertThat(repository.findPage(FeedbackStatus.COMPLETED, null, 0, 100)).extracting(Feedback::id)
            .doesNotContain(older.id(), newer.id());
        assertThat(repository.count(null, FeedbackSubjectType.PRODUCT_CORRECTION))
            .isEqualTo(repository.findPage(null, FeedbackSubjectType.PRODUCT_CORRECTION, 0, 100).size());
    }

    @Test
    @DisplayName("cutoff 이전의 두 의견 종류를 오래된 순서로 찾고 이미지 행까지 삭제한다")
    void findsAndDeletesExpiredFeedback() {
        UUID image = givenPending(CLOCK.instant());
        Feedback oldest = serviceFeedback(FeedbackType.OTHER, null, RECEIVED_AT.minusDays(100))
            .attachImages(List.of(image));
        repository.save(oldest);
        Feedback correction = new ProductCorrection(
            UUID.randomUUID(),
            1L,
            "블랙 스네일 토너",
            new FeedbackContent("전성분 정보를 정확하게 정정해 주세요"),
            RECEIVED_AT.minusDays(90)
        );
        Feedback fresh = serviceFeedback(FeedbackType.BUG_REPORT, null, RECEIVED_AT.minusDays(82));
        repository.save(correction);
        repository.save(fresh);
        OffsetDateTime cutoff = RECEIVED_AT.minusDays(83);

        assertThat(repository.findExpiredIds(cutoff, 10)).containsExactly(oldest.id(), correction.id());
        assertThat(repository.deleteExpired(oldest.id(), cutoff)).isTrue();
        assertThat(repository.deleteExpired(correction.id(), cutoff)).isTrue();
        assertThat(repository.deleteExpired(fresh.id(), cutoff)).isFalse();

        assertThat(repository.exists(oldest.id())).isFalse();
        assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from inquiry_image where feedback_id = ?",
                Long.class,
                oldest.id()
            )
        ).isZero();
        assertThat(repository.exists(fresh.id())).isTrue();
    }

    @Test
    @DisplayName("목록은 DB 에서 요청한 페이지만 읽고 이미지와 함께 돌려준다")
    void readsOnlyRequestedPage() {
        long before = repository.count(null, FeedbackSubjectType.BUG_REPORT);
        List<Feedback> saved = IntStream.range(0, 3)
            .mapToObj(index -> serviceFeedback(FeedbackType.BUG_REPORT, null, RECEIVED_AT.plusDays(10 + index)))
            .toList();
        saved.forEach(repository::save);

        assertThat(repository.count(null, FeedbackSubjectType.BUG_REPORT)).isEqualTo(before + 3);
        assertThat(repository.findPage(null, FeedbackSubjectType.BUG_REPORT, 0, 2)).extracting(Feedback::id)
            .containsExactly(saved.get(2).id(), saved.get(1).id());
        assertThat(repository.findPage(null, FeedbackSubjectType.BUG_REPORT, 2, 1)).extracting(Feedback::id)
            .containsExactly(saved.get(0).id());
    }

    @Test
    @DisplayName("없는 의견은 의견 없음으로 알리고 존재 여부를 판정한다")
    void rejectsUnknownFeedback() {
        UUID unknown = UUID.randomUUID();

        assertThat(repository.exists(unknown)).isFalse();
        assertThatThrownBy(() -> repository.findById(unknown))
            .isInstanceOf(ResourceNotFoundException.class)
            .extracting(exception -> ((ResourceNotFoundException) exception).code())
            .isEqualTo(ErrorCode.FEEDBACK_NOT_FOUND);
    }

    private static Feedback serviceFeedback(FeedbackType type, String path, OffsetDateTime receivedAt) {
        return new ServiceFeedback(
            UUID.randomUUID(),
            type,
            FeedbackPath.from(path),
            new FeedbackContent("검색 결과가 제대로 나오지 않아요"),
            receivedAt
        );
    }

    private int rowCount(String table, UUID id) {
        return jdbcTemplate.queryForObject("select count(*) from " + table + " where id = ?", Integer.class, id);
    }

}
