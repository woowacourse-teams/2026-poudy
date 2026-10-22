package com.poudy.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RecoveryStateIntegrationTest {
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    UserRepository users;
    @Autowired
    RecoveryRepository recovery;

    @Test
    void restoreStoresTheLatestRecoveryOnTheUserAndKeepsListFields() {
        String email = UUID.randomUUID() + "@example.com";
        long id = user(email);
        LocalDateTime now = now();
        LocalDateTime withdrawn = now.minusDays(1);
        LocalDateTime requested = now.minusHours(12);
        jdbc.update("update \"user\" set deleted_at=?,restore_requested_at=? where id=?", withdrawn, requested, id);

        assertThat(users.restore(id)).isTrue();
        assertThat(users.restore(id)).isFalse();
        assertThat(recovery.count(email, null, "RESTORED")).isEqualTo(1);
        var account = recovery.find(email, null, "RESTORED", 0, 20).getFirst();
        assertThat(account.withdrawnAt()).isEqualTo(withdrawn.atOffset(ZoneOffset.ofHours(9)));
        assertThat(account.requestedAt()).isEqualTo(requested.atOffset(ZoneOffset.ofHours(9)));
        assertThat(account.restoredAt()).isEqualTo(now.atOffset(ZoneOffset.ofHours(9)));
        assertThat(account.canRestore()).isFalse();
        assertThat(jdbc.queryForObject("select deleted_at from \"user\" where id=?", LocalDateTime.class, id)).isNull();
        assertThat(jdbc.queryForObject("select restore_requested_at from \"user\" where id=?", LocalDateTime.class, id))
            .isNull();
    }

    @Test
    void aNewWithdrawalClearsPreviousRecoveryAndRequiresANewRequest() {
        String email = UUID.randomUUID() + "@example.com";
        long id = user(email);
        assertThat(users.withdraw(id)).isTrue();
        assertThat(users.requestRestore(id)).isTrue();
        assertThat(users.restore(id)).isTrue();

        assertThat(users.withdraw(id)).isTrue();
        assertThat(recovery.count(email, null, "RESTORED")).isZero();
        assertThat(recovery.detail(id).canRestore()).isFalse();
        assertThat(recovery.detail(id).requestedAt()).isNull();
        var row = jdbc
            .queryForMap("select restored_at,restored_withdrawn_at,restored_requested_at from \"user\" where id=?", id);
        assertThat(row.values()).containsOnlyNulls();
        assertThat(users.restore(id)).isFalse();

        assertThat(users.requestRestore(id)).isTrue();
        assertThat(users.restore(id)).isTrue();
        assertThat(recovery.count(email, null, "RESTORED")).isEqualTo(1);
    }

    @Test
    void onlyTheLastThirtyDaysOfCompletedRecoveryAreListed() {
        String email = UUID.randomUUID() + "@example.com";
        long id = user(email);
        LocalDateTime boundary = now().minusDays(30);
        jdbc.update(
            "update \"user\" set restored_at=?,restored_withdrawn_at=?,restored_requested_at=? where id=?",
            boundary,
            boundary.minusDays(1),
            boundary.minusHours(1),
            id
        );
        assertThat(recovery.count(email, null, "RESTORED")).isEqualTo(1);
        jdbc.update("update \"user\" set restored_at=? where id=?", boundary.minusNanos(1000), id);
        assertThat(recovery.count(email, null, "RESTORED")).isZero();
        assertThat(recovery.find(email, null, "RESTORED", 0, 20)).isEmpty();
    }

    @Test
    void migrationKeepsOnlyTheLatestCompletedRecoveryOfActiveUsers() throws Exception {
        jdbc.execute(
            "alter table \"user\" drop column restored_at,drop column restored_withdrawn_at,drop column restored_requested_at"
        );
        String previous = new ClassPathResource("db/migration/V28__user_recovery_history.sql")
            .getContentAsString(StandardCharsets.UTF_8);
        jdbc.execute(previous.substring(0, previous.indexOf("CREATE TABLE user_retention_monthly_stat")));
        jdbc.execute(
            "create function record_user_recovery() returns trigger language plpgsql as $$ begin return NEW; end; $$"
        );
        jdbc.execute(
            "create trigger record_recovery after update of deleted_at,restore_requested_at on \"user\" for each row execute function record_user_recovery()"
        );
        String email = UUID.randomUUID() + "@example.com";
        long active = user(email);
        long withdrawn = user(UUID.randomUUID() + "@example.com");
        LocalDateTime recent = now().minusDays(1);
        addHistory(active, recent.minusDays(5), recent.minusDays(4), recent.minusDays(3));
        addHistory(active, recent.minusDays(2), recent.minusDays(1), recent);
        addHistory(active, recent.plusHours(1), recent.plusHours(2), null);
        addHistory(withdrawn, recent.minusDays(5), recent.minusDays(4), recent.minusDays(3));
        jdbc.update(
            "update \"user\" set deleted_at=?,restore_requested_at=? where id=?",
            recent,
            recent.plusHours(1),
            withdrawn
        );

        String migration = new ClassPathResource("db/migration/V39__move_recovery_state_to_user.sql")
            .getContentAsString(StandardCharsets.UTF_8);
        jdbc.execute(migration);

        assertThat(jdbc.queryForObject("select to_regclass('user_withdrawal_history')::text", String.class)).isNull();
        assertThat(jdbc.queryForObject("select to_regprocedure('record_user_recovery()')::text", String.class))
            .isNull();
        var account = recovery.find(email, null, "RESTORED", 0, 20).getFirst();
        assertThat(account.restoredAt()).isEqualTo(recent.atOffset(ZoneOffset.ofHours(9)));
        assertThat(account.withdrawnAt()).isEqualTo(recent.minusDays(2).atOffset(ZoneOffset.ofHours(9)));
        assertThat(account.requestedAt()).isEqualTo(recent.minusDays(1).atOffset(ZoneOffset.ofHours(9)));
        assertThat(recovery.count(email, null, "RESTORED")).isEqualTo(1);
        assertThat(recovery.detail(withdrawn).withdrawnAt()).isEqualTo(recent.atOffset(ZoneOffset.ofHours(9)));
        assertThat(recovery.detail(withdrawn).requestedAt())
            .isEqualTo(recent.plusHours(1).atOffset(ZoneOffset.ofHours(9)));
        assertThat(jdbc.queryForObject("select restored_at from \"user\" where id=?", LocalDateTime.class, withdrawn))
            .isNull();
    }

    private long user(String email) {
        return jdbc.queryForObject(
            "insert into \"user\"(oauth_provider,oauth_provider_id,email) values('GOOGLE',?,?) returning id",
            Long.class,
            UUID.randomUUID().toString(),
            email
        );
    }

    private LocalDateTime now() {
        return jdbc.queryForObject("select now() AT TIME ZONE 'Asia/Seoul'", LocalDateTime.class);
    }

    private void addHistory(long id, LocalDateTime withdrawn, LocalDateTime requested, LocalDateTime restored) {
        jdbc.update(
            "insert into user_withdrawal_history(user_id,withdrawn_at,requested_at,restored_at) values(?,?,?,?)",
            id,
            withdrawn,
            requested,
            restored
        );
    }
}
