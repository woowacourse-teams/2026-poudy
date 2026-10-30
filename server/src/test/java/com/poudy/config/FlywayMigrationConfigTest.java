package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@SpringBootTest
class FlywayMigrationConfigTest {

    private static final String HISTORY_SCRIPTS = "select version || ':' || script from %s.flyway_schema_history"
        + " where version in ('47', '48') order by installed_rank";

    @Value("${spring.datasource.url}")
    private String url;
    @Value("${spring.datasource.username}")
    private String username;
    @Value("${spring.datasource.password}")
    private String password;

    private String schema;
    private JdbcTemplate jdbc;
    private Flyway flyway;

    @BeforeEach
    void setUp() {
        schema = "flyway_manual_history_" + UUID.randomUUID().toString().replace("-", "");
        DataSource source = new DriverManagerDataSource(url, username, password);
        jdbc = new JdbcTemplate(source);
        flyway = Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema)
            .locations("classpath:db/migration").cleanDisabled(false).load();
    }

    @AfterEach
    void tearDown() {
        flyway.clean();
    }

    @Test
    @DisplayName("수동 적재가 등록한 V47·V48 이력을 지우고 레포의 V47 이후를 적용한다")
    void removesManualImportHistoryBeforeMigrating() {
        Flyway.configure().configuration(flyway.getConfiguration()).target("46").load().migrate();
        registerManualImport("47", "allow mg amount unit", "V47__allow_mg_amount_unit.sql");
        registerManualImport("48", "import seedmool products", "V48__import_seedmool_products.sql");
        assertThatThrownBy(flyway::migrate).isInstanceOf(FlywayValidateException.class);

        new FlywayMigrationConfig().manualImportHistoryCleanupStrategy().migrate(flyway);

        assertThat(jdbc.queryForList(HISTORY_SCRIPTS.formatted(schema), String.class)).containsExactly(
            "47:V47__product_search_match_evidence.sql",
            "48:V48__separate_product_search_stages.sql"
        );
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("49");
    }

    @Test
    @DisplayName("레포의 V47·V48만 있는 DB는 이력을 지우지 않는다")
    void keepsRepositoryHistory() {
        flyway.migrate();

        new FlywayMigrationConfig().manualImportHistoryCleanupStrategy().migrate(flyway);

        assertThat(jdbc.queryForList(HISTORY_SCRIPTS.formatted(schema), String.class)).containsExactly(
            "47:V47__product_search_match_evidence.sql",
            "48:V48__separate_product_search_stages.sql"
        );
    }

    @Test
    @DisplayName("이력 테이블이 없는 새 DB는 그대로 마이그레이션한다")
    void migratesEmptyDatabase() {
        new FlywayMigrationConfig().manualImportHistoryCleanupStrategy().migrate(flyway);

        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("49");
    }

    private void registerManualImport(String version, String description, String script) {
        jdbc.update(
            """
                insert into %s.flyway_schema_history
                    (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
                select max(installed_rank) + 1, ?, ?, 'SQL', ?, 12345, current_user, 0, true
                from %s.flyway_schema_history
                """
                .formatted(schema, schema),
            version,
            description,
            script
        );
    }
}
