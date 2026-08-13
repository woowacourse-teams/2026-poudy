package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ConflictException;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProductFilterRequestTest {

    @Test
    void rejectsIngredientPresentInBothFilters() {
        ProductFilterRequest request = filterOf(List.of(1001L, 1005L), List.of(1005L));

        assertThatThrownBy(request::validateIngredientFilters).isInstanceOf(ConflictException.class);
    }

    @Test
    void acceptsDisjointIngredientFilters() {
        ProductFilterRequest request = filterOf(List.of(1005L), List.of(1001L));

        assertThatCode(request::validateIngredientFilters).doesNotThrowAnyException();
    }

    @Test
    void acceptsMissingIngredientFilters() {
        assertThatCode(filterOf(null, null)::validateIngredientFilters).doesNotThrowAnyException();
        assertThatCode(filterOf(List.of(1005L), null)::validateIngredientFilters).doesNotThrowAnyException();
        assertThatCode(filterOf(null, List.of(1001L))::validateIngredientFilters).doesNotThrowAnyException();
    }

    private ProductFilterRequest filterOf(List<Long> include, List<Long> exclude) {
        return new ProductFilterRequest(null, null, null, null, null, null, include, exclude);
    }
}
