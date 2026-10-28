package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.product.domain.Mark;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProductMarkSchemaTest {
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void storesOnlyCodesAndRemovesAttributeTables() {
        assertThat(
            jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = 'mark' order by ordinal_position",
                String.class
            )
        )
            .containsExactly("code");
        assertThat(jdbc.queryForList("select code from mark", String.class))
            .containsExactlyInAnyOrderElementsOf(Arrays.stream(Mark.values()).map(Mark::code).toList());
        assertThat(
            jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = current_schema() and table_name in ('attribute','attribute_value','category_attribute','product_attribute_value','badge','product_badge')",
                Long.class
            )
        )
            .isZero();
    }

    @Test
    void rejectsDuplicateAttachments() {
        jdbc.update("insert into product_mark(product_id, mark_code) values (1, 'DAISO')");
        assertThatThrownBy(() -> jdbc.update("insert into product_mark(product_id, mark_code) values (1, 'DAISO')"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsUnknownMarkCodes() {
        assertThatThrownBy(() -> jdbc.update("insert into product_mark(product_id, mark_code) values (1, 'UNKNOWN')"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

}
