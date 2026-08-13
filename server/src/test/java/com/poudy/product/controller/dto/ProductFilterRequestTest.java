package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ConflictException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 필터 조건")
class ProductFilterRequestTest {

    @Test
    @DisplayName("같은 성분이 포함과 제외에 함께 있으면 거절한다")
    void rejectsIngredientPresentInBothFilters() {
        ProductFilterRequest request = filterOf(List.of(1001L, 1005L), List.of(1005L));

        assertThatThrownBy(request::validateIngredientFilters).isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("포함과 제외가 겹치지 않으면 통과한다")
    void acceptsDisjointIngredientFilters() {
        ProductFilterRequest request = filterOf(List.of(1005L), List.of(1001L));

        assertThatCode(request::validateIngredientFilters).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("성분 조건이 없으면 통과한다")
    void acceptsMissingIngredientFilters() {
        assertThatCode(filterOf(null, null)::validateIngredientFilters).doesNotThrowAnyException();
        assertThatCode(filterOf(List.of(1005L), null)::validateIngredientFilters).doesNotThrowAnyException();
        assertThatCode(filterOf(null, List.of(1001L))::validateIngredientFilters).doesNotThrowAnyException();
    }

    private ProductFilterRequest filterOf(List<Long> include, List<Long> exclude) {
        return new ProductFilterRequest(null, null, null, null, null, null, include, exclude);
    }
}
