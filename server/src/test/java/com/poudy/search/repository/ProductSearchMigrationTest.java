package com.poudy.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
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
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

@SpringBootTest
class ProductSearchMigrationTest {
    @Value("${spring.datasource.url}")
    private String url;
    @Value("${spring.datasource.username}")
    private String username;
    @Value("${spring.datasource.password}")
    private String password;

    private JdbcTemplate jdbc;

    @Test
    void upgradesV33AndPreservesOldCallsRawColumnsOwnerAndGrants() throws Exception {
        String schema = "product_search_migration_" + UUID.randomUUID().toString().replace("-", "");
        DataSource source = new DriverManagerDataSource(url, username, password);
        Flyway previous = Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema)
            .locations("classpath:db/migration").target("33").cleanDisabled(false).load();
        try {
            previous.migrate();
            try (Connection connection = source.getConnection()) {
                connection.setAutoCommit(false);
                jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
                jdbc.execute("set local search_path to " + schema + ", public");
                jdbc.execute("insert into category select * from public.category");
                ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/search-test-data.sql"));
                ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource("db/product-equivalent-spelling-test-data.sql")
                );
                assertSearchUpgrade();
                connection.rollback();
            }
        } finally {
            previous.clean();
        }
    }

    private void assertSearchUpgrade() throws Exception {
        jdbc.execute("grant select on product_search_document to public");
        String owner = jdbc.queryForObject(
            "select pg_get_userbyid(relowner) from pg_class where oid='product_search_document'::regclass",
            String.class
        );
        List<String> functions = List.of(
            "search_products(text,bigint,integer,integer)",
            "search_products_v2(text,bigint,integer,integer)",
            "search_products_page(text,bigint,integer,integer)",
            "search_products_page_v2(text,bigint,integer,integer)",
            "search_products_core(text)"
        );
        List<Long> identities = functions.stream().map(this::identity).toList();
        List<String> raw = jdbc
            .queryForList("select product_norm from product_search_document order by product_id", String.class);
        assertThat(jdbc.queryForObject("select total from search_products_v2('썬크림',0,100,2)", Long.class)).isEqualTo(4);

        jdbc.execute(
            Files.readString(Path.of("src/main/resources/db/migration/V40__product_search_standard_form.sql"))
        );

        assertThat(functions.stream().map(this::identity).toList()).isEqualTo(identities);
        assertThat(
            jdbc.queryForList("select product_norm from product_search_document order by product_id", String.class)
        ).isEqualTo(raw);
        assertThat(
            jdbc.queryForObject(
                "select pg_get_userbyid(relowner) from pg_class where oid='product_search_document'::regclass",
                String.class
            )
        ).isEqualTo(owner);
        assertThat(
            jdbc.queryForObject(
                "select count(*) from pg_class c, aclexplode(c.relacl) a where c.oid='product_search_document'::regclass and a.grantee=0 and a.privilege_type='SELECT'",
                Integer.class
            )
        ).isEqualTo(1);
        for (String name : List.of("search_products", "search_products_v2")) {
            for (String args : List.of("'썬크림'", "'썬크림',0", "'썬크림',0,100", "'썬크림',0,100,2")) {
                assertThat(jdbc.queryForMap("select * from " + name + "(" + args + ")"))
                    .containsOnlyKeys("total", "corrected_query", "items").containsEntry("total", 7L);
            }
        }
        assertThat(jdbc.queryForList("select product_id from search_product_names('수분썬크림')", Long.class))
            .containsExactlyInAnyOrder(90101L, 90104L);
        assertThat(jdbc.queryForObject("select total from search_ingredients('계약성분',0,10)", Long.class)).isEqualTo(2);
        assertThat(
            jdbc.queryForObject(
                "select count(*) from pg_indexes where schemaname=current_schema() and tablename='product_search_document'",
                Integer.class
            )
        ).isEqualTo(5);
    }

    private Long identity(String signature) {
        return jdbc.queryForObject("select ?::regprocedure::oid", Long.class, signature);
    }

}
