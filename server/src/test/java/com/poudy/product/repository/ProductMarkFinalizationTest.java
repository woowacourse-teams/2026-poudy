package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProductMarkFinalizationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void promotesViewsToPhysicalTablesPreservingDataAndConstraints() {
        jdbc.update("insert into badge(code, name) values ('DAISO', '다이소')");
        jdbc.update("insert into product_badge(product_id, badge_code) values (1, 'DAISO')");
        assertThat(jdbc.queryForObject("select total from search_products_v2('다이소', 0, 5, 2)", Long.class))
            .isEqualTo(1);
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/deferred/finalize_product_marks.sql"));
            return null;
        });
        assertThat(jdbc.queryForList("""
            select table_name from information_schema.tables where table_schema = current_schema()
            and table_type = 'BASE TABLE' and table_name in ('mark', 'product_mark') order by table_name
            """, String.class)).containsExactly("mark", "product_mark");
        assertThat(jdbc.queryForObject("""
            select m.name from product_mark pm join mark m on m.code = pm.mark_code where pm.product_id = 1
            """, String.class)).isEqualTo("다이소");
        assertThat(jdbc.queryForObject("""
            select count(*) from information_schema.table_constraints
            where table_schema = current_schema() and table_name = 'product_mark' and constraint_type = 'FOREIGN KEY'
            """, Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select total from search_products_v2('다이소', 0, 5, 2)", Long.class))
            .isEqualTo(1);
        assertThat(
            jdbc.queryForObject("select items->0->>'matchField' from search_products_v2('다이소', 0, 5, 2)", String.class)
        )
            .isEqualTo("MARK");
    }
}
