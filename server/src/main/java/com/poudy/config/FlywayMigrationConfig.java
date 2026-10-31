package com.poudy.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 2026-10 수동 제품 적재는 SQL을 실행한 뒤 flyway_schema_history에 V47·V48을 직접 등록했다.
 * 레포의 V47·V48(검색)과 버전이 겹쳐 Flyway 검증이 실패하므로, 마이그레이션 전에 운영에서 확인한 두 행을
 * 버전·스크립트명·체크섬이 모두 같을 때만 지운다. 값이 다른 행은 남겨 Flyway 검증이 배포를 멈추게 한다.
 * 적재한 데이터와 바뀐 제약은 그대로 두고, 제약은 V49가 레포에 반영한다.
 * 운영 배포에서 이력이 지워진 것을 확인하면 이 설정을 제거한다.
 */
@Configuration
@Profile("!test")
public class FlywayMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayMigrationConfig.class);

    @Bean
    public FlywayMigrationStrategy manualImportHistoryCleanupStrategy() {
        return flyway -> {
            removeManualImportHistory(flyway);
            flyway.migrate();
        };
    }

    private void removeManualImportHistory(Flyway flyway) {
        String schema = flyway.getConfiguration().getDefaultSchema();
        String historyTable = flyway.getConfiguration().getTable();
        String table = schema == null ? historyTable : schema + "." + historyTable;
        JdbcTemplate jdbc = new JdbcTemplate(flyway.getConfiguration().getDataSource());
        if (!Boolean.TRUE.equals(jdbc.queryForObject("select to_regclass(?) is not null", Boolean.class, table))) {
            return;
        }
        jdbc.query(
            "delete from " + table + " where (version, script, checksum) in ("
                + "('47', 'V47__allow_disclosed_ingredient_mass.sql', 975854454), "
                + "('48', 'V48__import_sidmool_products.sql', -169888571)"
                + ") returning version, script, checksum",
            row -> {
                log.warn(
                    "event=flyway_manual_history_removed version={} script={} checksum={}",
                    row.getString("version"),
                    row.getString("script"),
                    row.getObject("checksum")
                );
            }
        );
    }
}
