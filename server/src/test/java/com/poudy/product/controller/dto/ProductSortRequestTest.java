package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.domain.ProductSort;
import org.junit.jupiter.api.Test;

class ProductSortRequestTest {

    @Test
    void usesNameAscendingWhenSortIsMissing() {
        ProductSortRequest request = new ProductSortRequest(null);

        assertThat(request.sort()).isEqualTo(ProductSort.NAME_ASC);
    }
}
