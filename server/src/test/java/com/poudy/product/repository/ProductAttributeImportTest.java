package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional(isolation = Isolation.SERIALIZABLE)
class ProductAttributeImportTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void movesKnownAttributesAndPreservesDaisoAndUnknownCodes() throws Exception {
        jdbc.update("""
            insert into badge(code, name) values ('MINERAL', '무기자차'), ('EASY_WASH', '이지워시'),
                ('DAISO', '다이소'), ('OTHER', '기존표식')
            """);
        jdbc.update("""
            insert into product_badge(product_id, badge_code) values
                (1, 'MINERAL'), (1, 'EASY_WASH'), (1, 'DAISO'), (1, 'OTHER')
            """);
        jdbc.update(
            "update product_badge set created_at = '2000-01-01', updated_at = '2000-01-02' where product_id = 1"
        );
        importAttributes();
        jdbc.execute("set constraints all immediate");
        assertThat(
            jdbc.queryForList(
                "select value_code from product_attribute_value where product_id = 1 order by value_code",
                String.class
            )
        ).containsExactly("EASY_WASH", "MINERAL");
        assertThat(
            jdbc.queryForList(
                "select mark_code from product_mark where product_id = 1 order by mark_code",
                String.class
            )
        ).containsExactly("DAISO", "OTHER");
        assertThat(jdbc.queryForObject("""
            select count(*) from product_attribute_value where product_id = 1
            and created_at = timestamp '2000-01-01' and updated_at = timestamp '2000-01-02'
            """, Long.class)).isEqualTo(2);
    }

    @Test
    void refusesConflictingLegacyValues() {
        jdbc.update("insert into badge(code, name) values ('MINERAL', '무기자차'), ('ORGANIC', '유기자차')");
        jdbc.update("insert into product_badge(product_id, badge_code) values (1, 'MINERAL'), (1, 'ORGANIC')");
        assertThatThrownBy(this::importAttributes).hasMessageContaining("충돌");
    }

    @Test
    void refusesMissingDefinitionsBeforeDeletingLegacyAttachments() {
        jdbc.update("delete from attribute_value where value_code = 'MINERAL'");
        assertThatThrownBy(this::importAttributes).hasMessageContaining("정의가 없다");
    }

    private void importAttributes() throws Exception {
        String sql = Files.readString(Path.of("scripts/sql/import-product-attributes.sql"), StandardCharsets.UTF_8)
            .replace(":category_id", "1").replace("BEGIN ISOLATION LEVEL SERIALIZABLE;", "").replace("COMMIT;", "");
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            try (var statement = connection.createStatement()) {
                statement.execute(sql);
            }
            return null;
        });
    }
}
