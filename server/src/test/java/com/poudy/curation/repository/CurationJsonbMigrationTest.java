package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.sitemap.domain.ContentUpdate;
import com.poudy.sitemap.repository.SitemapRepository;
import java.sql.Connection;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

@SpringBootTest
class CurationJsonbMigrationTest {
    @Value("${spring.datasource.url}")
    private String url;
    @Value("${spring.datasource.username}")
    private String username;
    @Value("${spring.datasource.password}")
    private String password;

    @Test
    void preservesLegacyContentAndOrderAndCanRemoveLegacyTables() throws Exception {
        // 임시 스키마가 애플리케이션의 풀 연결에 남지 않도록 전용 연결을 쓴다.
        DataSource dataSource = new DriverManagerDataSource(url, username, password);
        String schema = "curation_migration_" + UUID.randomUUID().toString().replace("-", "");
        Flyway previous = migration(dataSource, schema, "11");
        try {
            previous.migrate();
            try (Connection connection = dataSource.getConnection()) {
                connection.setSchema(schema);
                connection.setAutoCommit(false);
                JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
                jdbc.execute("insert into brand select * from public.brand");
                jdbc.execute("insert into category select * from public.category");
                jdbc.execute("insert into product select * from public.product");
                jdbc.execute("insert into product_variant select * from public.product_variant");
                ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/curation-legacy-data.sql"));
                connection.commit();

                migration(dataSource, schema, "12").migrate();
                // JSONB 배열 비교는 블록·필터·제품 순서와 NULL 키까지 함께 확인한다.
                assertThat(jdbc.queryForObject("""
                    select blocks = (select blocks from public.curation where id = 12)
                    from curation where id = 12
                    """, Boolean.class)).isTrue();
                assertThat(jdbc.queryForObject("select blocks::text from curation where id = 20", String.class))
                    .isEqualTo("[]");

                // 읽기 전환 후 수정된 JSONB는 구형 테이블로 다시 조립하면 안 된다.
                UUID linkId = UUID.fromString("00000000-0000-4000-8000-000000000091");
                jdbc.update("""
                    update curation set blocks = blocks || cast(? as jsonb), updated_at = now()
                    where id = 12
                    """, """
                    [{"id":"%s","type":"PRODUCT_LINK","spacingTop":8,"spacingBottom":24,
                      "label":"조건에 맞는 제품 보러가기",
                      "query":{"keyword":"토너","brandIds":[],"categoryIds":[],
                               "includeIngredientIds":[],"includeGroupCodes":[]}}]
                    """.formatted(linkId));
                List<String> beforeRemoval = jdbc.queryForList(
                    "select to_jsonb(c)::text from curation c order by id",
                    String.class
                );
                // 다른 연결에서 실행하는 Flyway가 이 연결의 잠금을 기다리지 않게 한다.
                connection.commit();
                assertThat(migration(dataSource, schema, "13").migrate().migrationsExecuted).isEqualTo(1);
                assertThat(jdbc.queryForList("select to_jsonb(c)::text from curation c order by id", String.class))
                    .containsExactlyElementsOf(beforeRemoval);
                for (String table : List.of(
                    "curation_block",
                    "curation_block_filter",
                    "curation_block_product",
                    "curation_block_product_filter"
                )) {
                    assertThat(jdbc.queryForObject("select to_regclass(?)::text", String.class, table)).as(table)
                        .isNull();
                }
                for (String function : List
                    .of("require_curation_block_child_type()", "require_curation_block_filters()")) {
                    assertThat(jdbc.queryForObject("select to_regprocedure(?)::text", String.class, function))
                        .as(function).isNull();
                }
                assertThat(
                    jdbc.queryForObject("select to_regprocedure('require_contiguous_order()')::text", String.class)
                )
                    .isNotNull();
                assertThat(
                    new CurationRepository(new NamedParameterJdbcTemplate(jdbc))
                        .findPublishedById(12L).orElseThrow().productIds()
                ).containsExactly(15L, 10L, 7L, 1L);
                assertThat(
                    new CurationDocumentCodec().decode(
                        jdbc.queryForObject("select blocks::text from curation where id = 12", String.class)
                    )
                ).extracting(block -> block.id()).endsWith(linkId);
                assertThat(new SitemapRepository(jdbc).findPublishedCurationUpdates())
                    .extracting(ContentUpdate::id).containsExactly(4L, 12L);
            }
        } finally {
            previous.clean();
        }
    }

    private Flyway migration(DataSource dataSource, String schema, String target) {
        return Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
            .locations("classpath:db/migration").target(target).cleanDisabled(false).load();
    }
}
