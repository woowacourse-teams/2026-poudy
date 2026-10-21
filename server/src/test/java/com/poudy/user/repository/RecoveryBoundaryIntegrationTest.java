package com.poudy.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.user.domain.RetainedUserData;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional
class RecoveryBoundaryIntegrationTest {
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    NamedParameterJdbcTemplate namedJdbc;
    @Autowired
    UserRepository users;

    @Test
    void sevenDayFilterCountAndResponseAgreeAtTheExactBoundary() {
        var clock = Clock.fixed(Instant.parse("2026-10-31T15:00:00Z"), ZoneOffset.UTC);
        var repository = new RecoveryRepository(namedJdbc, Duration.ofDays(30), clock);
        var cutoff = LocalDateTime.of(2026, 10, 9, 0, 0);
        long justOutside = withdrawn(cutoff.plusNanos(1000));
        long exactly = withdrawn(cutoff);
        long justInside = withdrawn(cutoff.minusNanos(1000));
        assertThat(repository.find(null, null, "EXPIRING", 0, 100))
            .extracting(a -> a.userId()).contains(exactly, justInside).doesNotContain(justOutside);
        assertThat(repository.detail(exactly).status()).isEqualTo("EXPIRING");
        assertThat(repository.detail(justOutside).status()).isEqualTo("AVAILABLE");
        assertThat(repository.count(null, null, "EXPIRING")).isEqualTo(repository.available(true));
        assertThat(repository.find(null, null, "EXPIRING", 0, 100))
            .allSatisfy(a -> assertThat(a.status()).isEqualTo("EXPIRING"));
    }

    @Test
    void exactRetentionDeadlineIsNotRestorableAndIsPurgeEligible() {
        // PostgreSQL now()는 이 테스트 트랜잭션 내에서 고정된다. 마이크로초 전/정각/후를 실제 SQL로 검사한다.
        var now = jdbc.queryForObject("select now() AT TIME ZONE 'Asia/Seoul'", LocalDateTime.class);
        var cutoff = now.minusDays(30);
        long expired = withdrawn(cutoff.minusNanos(1000));
        long exactly = withdrawn(cutoff);
        long inside = withdrawn(cutoff.plusNanos(1000));
        assertThat(users.restore(expired)).isFalse();
        assertThat(users.restore(exactly)).isFalse();
        assertThat(users.restore(inside)).isTrue();
        users.deleteWithdrawnBefore(cutoff.atOffset(ZoneOffset.ofHours(9)));
        assertThat(jdbc.queryForObject("select count(*) from \"user\" where id in (?,?)", Long.class, expired, exactly))
            .isZero();
        assertThat(users.isActive(inside)).isTrue();
    }

    @Test
    void restoreUsesConfiguredRetentionRatherThanHardcodedThirtyDays() {
        var now = jdbc.queryForObject("select now() AT TIME ZONE 'Asia/Seoul'", LocalDateTime.class);
        var shorter = new UserRepository(namedJdbc, Duration.ofDays(14));
        long expired = withdrawn(now.minusDays(14));
        long inside = withdrawn(now.minusDays(14).plusNanos(1000));
        assertThat(shorter.restore(expired)).isFalse();
        assertThat(shorter.restore(inside)).isTrue();
    }

    @Test
    void monthlyTriggersUseSeoulMonthAcrossUtcBoundaryAndRetainNoUserHistoryAfterPurge() {
        // 운영 함수의 시간 읽기만 테스트 트랜잭션에서 치환한다. 월 계산·트리거·갱신 SQL은 원본 그대로 실행하며 DDL도 rollback된다.
        var function = jdbc
            .queryForObject("select pg_get_functiondef('record_user_recovery()'::regprocedure)", String.class);
        assertThat(function).contains("now()");
        jdbc.execute(function.replace("now()", "(current_setting('poudy.test.now')::timestamptz)"));
        jdbc.execute("SET LOCAL TIME ZONE 'UTC'");
        var october = LocalDate.of(2026, 10, 1);
        var november = LocalDate.of(2026, 11, 1);
        long octoberBefore = count(october, "admin_restore_count");
        long novemberBefore = count(november, "admin_restore_count");
        long purgedBefore = count(november, "purged_count");
        time("2026-10-31T14:59:59.999999Z");
        long first = withdrawn(
            jdbc.queryForObject("select now() AT TIME ZONE 'Asia/Seoul'", LocalDateTime.class).minusDays(1)
        );
        assertThat(users.restore(first)).isTrue();
        assertThat(count(october, "admin_restore_count")).isEqualTo(octoberBefore + 1);
        assertThat(count(november, "admin_restore_count")).isEqualTo(novemberBefore);
        time("2026-10-31T15:00:00Z");
        long second = withdrawn(
            jdbc.queryForObject("select now() AT TIME ZONE 'Asia/Seoul'", LocalDateTime.class).minusDays(1)
        );
        assertThat(users.restore(second)).isTrue();
        assertThat(count(october, "admin_restore_count")).isEqualTo(octoberBefore + 1);
        assertThat(count(november, "admin_restore_count")).isEqualTo(novemberBefore + 1);
        assertThat(
            jdbc.queryForObject(
                "select restored_at from user_withdrawal_history where user_id=?",
                LocalDateTime.class,
                second
            )
        )
            .isEqualTo(LocalDateTime.of(2026, 11, 1, 0, 0));
        long purged = withdrawn(
            jdbc.queryForObject("select now() AT TIME ZONE 'Asia/Seoul'", LocalDateTime.class).minusDays(31)
        );
        jdbc.update("delete from \"user\" where id=?", purged);
        assertThat(count(november, "purged_count")).isEqualTo(purgedBefore + 1);
        assertThat(
            jdbc.queryForObject("select count(*) from user_withdrawal_history where user_id=?", Long.class, purged)
        ).isZero();
    }

    @Test
    void wishlistCountExcludesRemovedProducts() {
        RecoveryRepository repository = new RecoveryRepository(namedJdbc, Duration.ofDays(30), Clock.systemUTC());
        long id = withdrawn(LocalDateTime.of(2026, 10, 1, 0, 0));
        jdbc.update("insert into user_wishlist_product (user_id, product_id) values (?, 1)", id);
        jdbc.update("insert into user_wishlist_product (user_id, product_id, deleted_at) values (?, 7, now())", id);
        assertThat(repository.retainedData(id).wishlist()).isEqualTo(1L);
    }

    @Test
    void shelfCountsExcludeRemovedProducts() {
        RecoveryRepository repository = new RecoveryRepository(namedJdbc, Duration.ofDays(30), Clock.systemUTC());
        long id = withdrawn(LocalDateTime.of(2026, 10, 1, 0, 0));
        jdbc.update(
            "insert into user_shelf_product (user_id, product_id, usage_status, rating_preference) "
                + "values (?, 1, 'IN_USE', 'GOOD')",
            id
        );
        jdbc.update(
            "insert into user_shelf_product (user_id, product_id, usage_status, rating_preference, deleted_at) "
                + "values (?, 7, 'IN_USE', 'BAD', now())",
            id
        );
        RetainedUserData retained = repository.retainedData(id);
        assertThat(retained.shelf()).isEqualTo(1L);
        assertThat(retained.ratings()).isEqualTo(1L);
    }

    private long withdrawn(LocalDateTime at) {
        long id = jdbc.queryForObject(
            "insert into \"user\"(oauth_provider,oauth_provider_id,email) values('GOOGLE',?,?) returning id",
            Long.class,
            UUID.randomUUID().toString(),
            UUID.randomUUID() + "@example.com"
        );
        jdbc.update("update \"user\" set deleted_at=?,restore_requested_at=? where id=?", at, at, id);
        return id;
    }

    private void time(String instant) {
        jdbc.queryForObject("select set_config('poudy.test.now',?,true)", String.class, instant);
    }

    private long count(LocalDate month, String column) {
        return jdbc.queryForObject(
            "select coalesce((select " + column + " from user_retention_monthly_stat where month=?),0)",
            Long.class,
            month
        );
    }
}
