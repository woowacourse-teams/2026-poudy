package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

@SpringBootTest
class ProductComponentMigrationTest {
    @Value("${spring.datasource.url}")
    private String url;
    @Value("${spring.datasource.username}")
    private String username;
    @Value("${spring.datasource.password}")
    private String password;

    @Test
    @DisplayName("제품의 유수분·제조업체·제조국을 모든 구성품에 복사하고 제품 수정 시각은 그대로 둔다")
    public void copiesProductValuesToEveryComponent() throws Exception {
        String schema = "product_component_migration_" + UUID.randomUUID().toString().replace("-", "");
        DataSource source = new DriverManagerDataSource(url, username, password);
        try {
            migration(source, schema, "52").migrate();
            try (Connection connection = source.getConnection()) {
                connection.setAutoCommit(false);
                JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
                jdbc.execute("set search_path to " + schema + ", public");
                jdbc.update("insert into brand (id, korean_name) values (1, '검증 브랜드')");
                jdbc.update("insert into category (id, parent_id, name, depth) values (1, null, '스킨케어', 0)");
                jdbc.update("insert into manufacturer (id, name) values (90001, '검증 제조업체')");
                jdbc.update(
                    "insert into product (id, brand_id, category_id, product_name, moisture_level, oil_level,"
                        + " manufacturer_id, manufacturing_country, updated_at)"
                        + " values (1, 1, 1, '검증 키트', 2.5, 0.5, 90001, 'FR', '2026-01-01T00:00:00')"
                );
                jdbc.update(
                    "insert into product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)"
                        + " values (1, 1, 0, 1000, 50, 'ml', 'active')"
                );
                jdbc.update(
                    "insert into product_component (product_id, display_order, name) values (1, 0, '1제'), (1, 1, '2제')"
                );
                connection.commit();
            }

            JdbcTemplate jdbc = new JdbcTemplate(source);
            String productUpdatedAt = "select updated_at from " + schema + ".product where id = 1";
            LocalDateTime beforeMigration = jdbc.queryForObject(productUpdatedAt, LocalDateTime.class);

            migration(source, schema, "53").migrate();

            List<Map<String, Object>> components = jdbc.queryForList(
                "select moisture_level, oil_level, manufacturer_id, manufacturing_country from " + schema
                    + ".product_component order by display_order"
            );
            assertThat(components).hasSize(2).allSatisfy(component -> {
                assertThat(component.get("moisture_level")).isEqualTo(2.5);
                assertThat(component.get("oil_level")).isEqualTo(0.5);
                assertThat(component.get("manufacturer_id")).isEqualTo(90001L);
                assertThat(component.get("manufacturing_country")).isEqualTo("FR");
            });
            assertThat(jdbc.queryForObject(productUpdatedAt, LocalDateTime.class)).isEqualTo(beforeMigration);
        } finally {
            migration(source, schema, "53").clean();
        }
    }

    private Flyway migration(DataSource source, String schema, String target) {
        return Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema)
            .locations("classpath:db/migration").target(target).cleanDisabled(false).load();
    }
}
