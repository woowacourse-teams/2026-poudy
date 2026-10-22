package com.poudy.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Sql({"/db/search-test-data.sql", "/db/product-equivalent-spelling-test-data.sql"})
class ProductSearchMigrationTest {
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void upgradesV33AndPreservesOldCallsRawColumnsOwnerAndGrants() throws Exception {
        String v2 = Files.readString(Path.of("src/main/resources/db/migration/V2__search.sql"));
        String v33 = Files.readString(Path.of("src/main/resources/db/migration/V33__product_metadata_search.sql"));
        restore(v2, List.of("search_products_core", "search_correct_query"));
        restore(
            v33,
            List.of("search_product_metadata_hits", "search_products_core_v2", "search_correct_product_query_v2")
        );
        jdbc.execute("drop materialized view product_search_document");
        for (String signature : List.of(
            "search_product_query_tokens(text)",
            "search_product_match_piece(text,text)",
            "search_product_has_spelling(text)",
            "search_product_key(text)",
            "search_product_spelling_rules()"
        )) {
            jdbc.execute("drop function " + signature);
        }
        int start = v2.indexOf("CREATE MATERIALIZED VIEW product_search_document AS");
        int end = v2.indexOf("-- read 는", start);
        jdbc.execute(v2.substring(start, end));
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
            Files.readString(Path.of("src/main/resources/db/migration/V34__product_search_standard_form.sql"))
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
                "select count(*) from pg_indexes where tablename='product_search_document'",
                Integer.class
            )
        ).isEqualTo(5);
    }

    private Long identity(String signature) {
        return jdbc.queryForObject("select ?::regprocedure::oid", Long.class, signature);
    }

    private void restore(String migration, List<String> names) {
        for (String name : names) {
            int start = migration.indexOf("CREATE FUNCTION " + name + "(");
            int end = migration.indexOf("\n$$;", start) + 4;
            jdbc.execute(migration.substring(start, end).replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION"));
        }
    }
}
