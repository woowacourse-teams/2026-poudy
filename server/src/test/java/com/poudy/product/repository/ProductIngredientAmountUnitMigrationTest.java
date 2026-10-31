package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProductIngredientAmountUnitMigrationTest {

    private static final String DISCLOSE_AMOUNT = """
        update product_ingredient
        set disclosed_amount_type = 'exact', disclosed_amount_value = 5, disclosed_amount_unit = ?
        where (component_id, ingredient_id) = (
            select component_id, ingredient_id from product_ingredient
            order by component_id, ingredient_id limit 1
        )
        """;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("공개 함량 단위로 mg를 받고 정해지지 않은 단위는 거부한다")
    void acceptsMilligramAndRejectsUnknownUnit() {
        assertThat(jdbc.update(DISCLOSE_AMOUNT, "mg")).isEqualTo(1);
        assertThatThrownBy(() -> jdbc.update(DISCLOSE_AMOUNT, "mcg"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("mg 함량이 이미 있는 DB에 다시 적용해도 제약이 하나로 유지된다")
    void reappliesOnDatabaseThatAlreadyHasMilligram() {
        jdbc.update(DISCLOSE_AMOUNT, "mg");
        // 지연 제약 검사가 남아 있으면 같은 트랜잭션에서 ALTER TABLE을 할 수 없다.
        jdbc.execute("set constraints all immediate");

        runMigration();

        assertThat(
            jdbc.queryForList(
                """
                    select pg_get_constraintdef(oid) from pg_constraint
                    where conrelid = 'product_ingredient'::regclass and conname = 'ck_product_ingredient_amount_unit'
                    """,
                String.class
            )
        )
            .singleElement()
            .asString()
            .contains("'mg'");
    }

    private void runMigration() {
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            ScriptUtils.executeSqlScript(
                connection,
                new ClassPathResource("db/migration/V49__allow_mg_ingredient_amount_unit.sql")
            );
            return null;
        });
    }
}
