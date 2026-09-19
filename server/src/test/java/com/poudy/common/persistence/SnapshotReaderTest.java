package com.poudy.common.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@DisplayName("스냅샷 읽기")
class SnapshotReaderTest {

    private static final String PRODUCT_NAME = "스냅샷 확인용 요청";

    @Autowired
    private SnapshotReader snapshotReader;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void cleanUp() {
        jdbcTemplate.update("delete from product_request where product_name = ?", PRODUCT_NAME);
    }

    @Test
    @DisplayName("읽기 전용 REPEATABLE READ 트랜잭션에서 실행한다")
    void readsInRepeatableReadOnlyTransaction() {
        List<String> settings = snapshotReader.read(
            () -> List.of(
                jdbcTemplate.queryForObject("show transaction_isolation", String.class),
                jdbcTemplate.queryForObject("show transaction_read_only", String.class)
            )
        );

        assertThat(settings).containsExactly("repeatable read", "on");
    }

    @Test
    @DisplayName("읽는 도중 다른 트랜잭션이 커밋한 행은 같은 읽기 안에서 보이지 않는다")
    void ignoresRowsCommittedDuringRead() {
        List<Long> counts = snapshotReader.read(() -> {
            long before = countRequests();
            CompletableFuture.runAsync(this::insertRequest).join();
            return List.of(before, countRequests());
        });

        assertThat(counts.get(1)).isEqualTo(counts.get(0));
        assertThat(countRequests()).isEqualTo(counts.get(0) + 1);
    }

    private long countRequests() {
        return jdbcTemplate.queryForObject(
            "select count(*) from product_request where product_name = ?",
            Long.class,
            PRODUCT_NAME
        );
    }

    private void insertRequest() {
        OffsetDateTime now = OffsetDateTime.parse("2026-09-19T00:00:00Z");
        jdbcTemplate.update(
            "insert into product_request (id, product_name, requested_at, status, status_changed_at) values (?, ?, ?, 'RECEIVED', ?)",
            UUID.randomUUID(),
            PRODUCT_NAME,
            now,
            now
        );
    }
}
