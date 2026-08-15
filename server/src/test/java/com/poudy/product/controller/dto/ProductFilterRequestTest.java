package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 필터 요청")
class ProductFilterRequestTest {

    @Test
    @DisplayName("오지 않은 목록 조건을 빈 목록으로 채운다")
    void fillsMissingListsWithEmptyLists() {
        ProductFilterRequest request = new ProductFilterRequest(null, null, null, null, null, null, null, null);

        assertThat(request.categoryIds()).isEmpty();
        assertThat(request.brandIds()).isEmpty();
        assertThat(request.moistureLevel()).isEmpty();
        assertThat(request.oilLevel()).isEmpty();
        assertThat(request.includeIngredientIds()).isEmpty();
        assertThat(request.excludeIngredientIds()).isEmpty();
        assertThat(request.excludeCodes()).isEmpty();
    }
}
