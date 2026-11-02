package com.poudy.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@DisplayName("가입 프로필 완료 상태 마이그레이션")
class UserProfileSetupMigrationTest {

    @Autowired
    private DataSource source;

    @Test
    void keepsExistingMembersCompleteAndNewMembersIncomplete() {
        String schema = "profile_setup_" + UUID.randomUUID().toString().replace("-", "");
        Flyway previous = migration(schema, "51");
        try {
            previous.migrate();
            JdbcTemplate jdbc = new JdbcTemplate(source);
            jdbc.update(
                "insert into " + schema
                    + ".\"user\" (oauth_provider, oauth_provider_id, email, nickname) values ('KAKAO', 'old', 'old@example.com', '기존 수달')"
            );
            assertThat(migration(schema, "52").migrate().migrationsExecuted).isEqualTo(1);
            assertThat(
                jdbc.queryForObject(
                    "select profile_setup_completed from " + schema + ".\"user\" where oauth_provider_id = 'old'",
                    Boolean.class
                )
            ).isTrue();
            jdbc.update(
                "insert into " + schema
                    + ".\"user\" (oauth_provider, oauth_provider_id, email, nickname) values ('KAKAO', 'new', 'new@example.com', '신규 수달')"
            );
            assertThat(
                jdbc.queryForObject(
                    "select profile_setup_completed from " + schema + ".\"user\" where oauth_provider_id = 'new'",
                    Boolean.class
                )
            ).isFalse();
        } finally {
            previous.clean();
        }
    }

    private Flyway migration(String schema, String target) {
        return Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema)
            .locations("classpath:db/migration").cleanDisabled(false).target(target).load();
    }
}
