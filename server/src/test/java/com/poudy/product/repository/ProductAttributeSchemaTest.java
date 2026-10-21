package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional(isolation = Isolation.SERIALIZABLE)
class ProductAttributeSchemaTest {

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void allowAttributes() {
        jdbc.update("insert into category_attribute(category_id, attribute_id) select 1, id from attribute");
        jdbc.execute("set constraints all immediate");
    }

    @Test
    void rejectsMultipleValuesOfTheSameAttribute() {
        assign(1, "UV_FILTER_TYPE", "MINERAL");
        assertThatThrownBy(() -> assign(1, "UV_FILTER_TYPE", "ORGANIC"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsValueOfAnotherAttribute() {
        assertThatThrownBy(() -> assign(1, "WASHABILITY", "MINERAL"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsAttributesOnUnmappedCategory() {
        jdbc.update("update product set category_id = 14 where id = 1");
        assertThatThrownBy(() -> assign(1, "WASHABILITY", "EASY_WASH"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsChildCategoryMapping() {
        assertThatThrownBy(
            () -> jdbc.update(
                "insert into category_attribute(category_id, attribute_id) select 2, id from attribute where code = 'WASHABILITY'"
            )
        )
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsRemovingUsedMapping() {
        assign(1, "WASHABILITY", "EASY_WASH");
        assertThatThrownBy(() -> jdbc.update("delete from category_attribute where category_id = 1"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsMovingProductOutsideScope() {
        assign(1, "WASHABILITY", "EASY_WASH");
        assertThatThrownBy(() -> jdbc.update("update product set category_id = 14 where id = 1"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsMovingChildCategoryOutsideScope() {
        assign(1, "WASHABILITY", "EASY_WASH");
        assertThatThrownBy(() -> jdbc.update("update category set parent_id = 13 where id = 2"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void updatesProductTimestampWhenValueChanges() {
        jdbc.update("update product set updated_at = '2000-01-01' where id = 1");
        assign(1, "WASHABILITY", "EASY_WASH");
        assertThat(
            jdbc.queryForObject("select updated_at > timestamp '2000-01-01' from product where id = 1", Boolean.class)
        )
            .isTrue();
    }

    private void assign(long product, String attribute, String value) {
        jdbc.update("""
            insert into product_attribute_value(product_id, attribute_id, value_code)
            select ?, id, ? from attribute where code = ?
            """, product, value, attribute);
    }
}
