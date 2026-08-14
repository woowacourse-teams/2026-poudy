package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InvalidRequestException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 필터")
class IngredientFilterTest {

    @Test
    @DisplayName("같은 성분이 포함과 제외에 함께 있으면 만들 수 없다")
    void rejectsIngredientPresentInBothSides() {
        assertThatThrownBy(() -> new IngredientFilter(List.of(1001L, 1005L), List.of(1005L)))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    @DisplayName("포함과 제외가 겹치지 않으면 만들 수 있다")
    void acceptsDisjointSides() {
        assertThatCode(() -> new IngredientFilter(List.of(1005L), List.of(1001L))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("조건이 없으면 빈 목록으로 채운다")
    void fillsMissingSidesWithEmptyLists() {
        IngredientFilter filter = new IngredientFilter(null, null);

        assertThat(filter.includedIds()).isEmpty();
        assertThat(filter.excludedIds()).isEmpty();
        assertThatCode(() -> new IngredientFilter(List.of(1005L), null)).doesNotThrowAnyException();
        assertThatCode(() -> new IngredientFilter(null, List.of(1001L))).doesNotThrowAnyException();
    }
}
