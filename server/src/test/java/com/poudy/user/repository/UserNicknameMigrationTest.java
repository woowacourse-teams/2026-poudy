package com.poudy.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@DisplayName("회원 닉네임 마이그레이션")
class UserNicknameMigrationTest {

    @Autowired
    private DataSource source;

    @Test
    @DisplayName("기존 회원에게 겹치지 않는 닉네임을 채우고 조합별 마지막 순번을 기록한다")
    void fillsNicknamesForExistingUsers() {
        String schema = "user_nickname_migration_" + UUID.randomUUID().toString().replace("-", "");
        Flyway previous = migration(source, schema, "50");
        try {
            previous.migrate();
            JdbcTemplate jdbc = new JdbcTemplate(source);
            jdbc.update(
                "insert into " + schema + ".\"user\" (oauth_provider, oauth_provider_id, email)"
                    + " select 'KAKAO', 'id-' || n, 'user' || n || '@example.com' from generate_series(1, 300) n"
            );

            assertThat(migration(source, schema, "51").migrate().migrationsExecuted).isEqualTo(1);

            List<String> nicknames = jdbc.queryForList("select nickname from " + schema + ".\"user\"", String.class);
            assertThat(nicknames).hasSize(300).doesNotHaveDuplicates()
                .allMatch(nickname -> nickname.matches("\\S+ \\S+ \\d{4,6}"));
            assertThat(
                jdbc.queryForObject(
                    "select count(*) from " + schema + ".nickname_sequence s where s.last_number <> 999 + ("
                        + "select count(*) from " + schema + ".\"user\" u"
                        + " where u.nickname like s.adjective || ' ' || s.noun || ' %')",
                    Integer.class
                )
            ).isZero();
        } finally {
            previous.clean();
        }
    }

    private Flyway migration(DataSource source, String schema, String target) {
        return Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema)
            .locations("classpath:db/migration").cleanDisabled(false).target(target).load();
    }
}
