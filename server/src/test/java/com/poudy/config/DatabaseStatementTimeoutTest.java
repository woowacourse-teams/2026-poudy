package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.profiles.include=prod",
        "POUDY_DB_URL=${POUDY_TEST_DB_URL:jdbc:postgresql://localhost:5432/poudy_test}",
        "POUDY_DB_STATEMENT_TIMEOUT_MS=300",
        "spring.datasource.hikari.maximum-pool-size=2",
        "spring.datasource.hikari.minimum-idle=0",
        "poudy.feedback.image-transfer.enabled=false",
        "poudy.feedback.retention.enabled=false"
})
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("운영 DB 연결의 쿼리 실행 상한")
class DatabaseStatementTimeoutTest {

    @DynamicPropertySource
    static void databaseCredentials(DynamicPropertyRegistry properties) {
        properties.add("POUDY_DB_USERNAME", () -> System.getenv().getOrDefault("POUDY_DB_USERNAME", "postgres"));
        properties.add("POUDY_DB_PASSWORD", () -> System.getenv().getOrDefault("POUDY_DB_PASSWORD", ""));
    }

    @Autowired
    private HikariDataSource dataSource;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private Flyway flyway;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("운영 설정을 사용하는 풀의 모든 연결에 상한이 있고 Flyway는 이를 상속하지 않는다")
    void appliesToEveryPoolConnectionButNotFlyway() throws Exception {
        try (Connection first = dataSource.getConnection(); Connection second = dataSource.getConnection()) {
            assertThat(timeoutOf(first)).isEqualTo("300ms");
            assertThat(timeoutOf(second)).isEqualTo("300ms");
        }
        assertThat(flyway.getConfiguration().getDataSource()).isNotSameAs(dataSource);
        try (Connection migration = flyway.getConfiguration().getDataSource().getConnection()) {
            assertThat(timeoutOf(migration)).isNotEqualTo("300ms");
        }
        assertThat(flyway.info().pending()).isEmpty();
    }

    @Test
    @DisplayName("느린 SQL 취소로 트랜잭션 전체가 롤백되고 연결은 다시 사용할 수 있다")
    void rollsBackPartialWriteAfterTimeout() {
        String total = "select coalesce(sum(view_count), 0) from product_daily_view where view_date = '2001-01-01'";
        Long before = jdbc.queryForObject(total, Long.class);
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> transaction.executeWithoutResult(ignored -> {
            jdbc.update(
                "insert into product_daily_view (view_date, product_id, view_count)"
                    + " values ('2001-01-01', (select min(id) from product), 1)"
                    + " on conflict (view_date, product_id) do update set view_count = product_daily_view.view_count + 1"
            );
            jdbc.execute("select pg_sleep(5)");
        })).isInstanceOf(QueryTimeoutException.class);

        assertThat(jdbc.queryForObject(total, Long.class)).isEqualTo(before);
        assertRecoveredPool();
    }

    @Test
    @DisplayName("실제 API의 잠금 대기는 서버 오류로 종료되고 다음 요청은 정상 처리된다")
    void cancelsLockedApiAndRecovers() throws Exception {
        try (Connection blocker = dataSource.getConnection(); var executor = Executors.newSingleThreadExecutor()) {
            blocker.setAutoCommit(false);
            try {
                try (var statement = blocker.createStatement()) {
                    statement.execute("lock table category in access exclusive mode");
                }
                var request = executor.submit(
                    () -> mockMvc.perform(get("/api/categories"))
                        .andExpect(status().isInternalServerError()).andReturn()
                );
                request.get(5, TimeUnit.SECONDS);
            } finally {
                blocker.rollback();
            }
        }
        assertRecoveredPool();
        mockMvc.perform(get("/api/categories")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("풀의 모든 연결에서 느린 쿼리가 취소된 뒤 정상 요청을 처리한다")
    void recoversAfterAllConnectionsAreOccupied() throws Exception {
        CyclicBarrier start = new CyclicBarrier(
            2,
            () -> assertThat(dataSource.getHikariPoolMXBean().getActiveConnections()).isEqualTo(2)
        );
        try (var executor = Executors.newFixedThreadPool(2)) {
            var requests = new ArrayList<Future<?>>();
            for (int index = 0; index < 2; index++) {
                requests.add(executor.submit(() -> {
                    TransactionTemplate transaction = new TransactionTemplate(transactionManager);
                    assertThatThrownBy(() -> transaction.executeWithoutResult(ignored -> {
                        try {
                            start.await(5, TimeUnit.SECONDS);
                        } catch (Exception exception) {
                            throw new IllegalStateException(exception);
                        }
                        jdbc.execute("select pg_sleep(5)");
                    })).isInstanceOf(QueryTimeoutException.class);
                }));
            }
            for (Future<?> request : requests) {
                request.get(5, TimeUnit.SECONDS);
            }
        }
        assertRecoveredPool();
        mockMvc.perform(get("/api/categories")).andExpect(status().isOk());
    }

    private String timeoutOf(Connection connection) throws Exception {
        try (var statement = connection.createStatement();
            var result = statement.executeQuery("show statement_timeout")) {
            result.next();
            return result.getString(1);
        }
    }

    private void assertRecoveredPool() {
        assertThat(jdbc.queryForObject("select 1", Integer.class)).isEqualTo(1);
        assertThat(dataSource.getHikariPoolMXBean().getActiveConnections()).isZero();
        assertThat(dataSource.getHikariPoolMXBean().getThreadsAwaitingConnection()).isZero();
    }
}
