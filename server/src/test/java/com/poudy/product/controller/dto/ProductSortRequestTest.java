package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.domain.ProductSort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 정렬 조건")
class ProductSortRequestTest {

    @Test
    @DisplayName("정렬 조건을 생략하면 이름 오름차순을 쓴다")
    void usesNameAscendingWhenSortIsMissing() {
        ProductSortRequest request = new ProductSortRequest(null);

        assertThat(request.sort()).isEqualTo(ProductSort.NAME_ASC);
    }
}
