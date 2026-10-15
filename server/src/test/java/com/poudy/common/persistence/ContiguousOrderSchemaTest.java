package com.poudy.common.persistence;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("목록 순서 컬럼 스키마")
class ContiguousOrderSchemaTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("0부터 이어지는 순서는 커밋 검사를 통과한다")
    void acceptsContiguousOrder() {
        insertIngredientWithTagOrders(0, 1);

        assertThatCode(this::checkDeferredConstraints).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("순서가 비면 커밋 검사에서 거부한다")
    void rejectsGapInOrder() {
        insertIngredientWithTagOrders(0, 2);

        assertThatThrownBy(this::checkDeferredConstraints).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("순서가 0에서 시작하지 않으면 거부한다")
    void rejectsOrderNotStartingAtZero() {
        insertIngredientWithTagOrders(1, 2);

        assertThatThrownBy(this::checkDeferredConstraints).isInstanceOf(DataIntegrityViolationException.class);
    }

    private void insertIngredientWithTagOrders(int first, int second) {
        long ingredientId = 9_000_001L;
        jdbcTemplate.update(
            "INSERT INTO ingredient (id, korean_name, description, updated_at) VALUES (?, '순서검사성분', '설명', now())",
            ingredientId
        );
        jdbcTemplate.update(
            "INSERT INTO ingredient_tag (ingredient_id, tag_code, display_order) VALUES (?, 'ABRASIVE', ?), (?, 'ANTIMICROBIAL', ?)",
            ingredientId,
            first,
            ingredientId,
            second
        );
    }

    private void checkDeferredConstraints() {
        jdbcTemplate.execute("SET CONSTRAINTS ALL IMMEDIATE");
    }
}
