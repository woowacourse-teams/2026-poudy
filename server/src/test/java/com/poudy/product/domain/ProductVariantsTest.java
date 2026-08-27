package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 용량 옵션")
class ProductVariantsTest {

    @Test
    @DisplayName("첫 번째 옵션을 목록의 대표 옵션으로 사용한다")
    void findsRepresentativeVariant() {
        ProductVariant first = variant(1L, 18000L);
        ProductVariant second = variant(2L, 27000L);

        assertThat(new ProductVariants(List.of(first, second)).representative()).isEqualTo(first);
    }

    @Test
    @DisplayName("제품은 하나 이상의 용량 옵션을 가져야 한다")
    void rejectsEmptyVariants() {
        assertThatThrownBy(() -> new ProductVariants(List.of()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품은 하나 이상의 용량 옵션을 가져야 합니다.");
    }

    private static ProductVariant variant(Long id, Long price) {
        return new ProductVariant(id, price, new BigDecimal("200"), "ml", "active");
    }
}
