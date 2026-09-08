package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.category.domain.Category;
import com.poudy.product.domain.Product;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("큐레이션")
class CurationTest {

    @Test
    @DisplayName("카테고리로 제품을 필터링해도 등록 순서를 유지한다")
    void filtersProductsKeepingEditorialOrder() {
        Product toner = product(1L, 1L, 2L);
        Product sunCream = product(2L, 13L, 14L);
        Product serum = product(3L, 1L, 3L);
        Curation curation = curation(List.of(toner, sunCream, serum));

        assertThat(curation.products(null)).extracting(Product::id).containsExactly(1L, 2L, 3L);
        assertThat(curation.products(1L)).extracting(Product::id).containsExactly(1L, 3L);
        assertThat(curation.products(2L)).extracting(Product::id).containsExactly(1L);
        assertThat(curation.products(999L)).isEmpty();
    }

    @Test
    @DisplayName("같은 제품을 중복 등록할 수 없다")
    void rejectsDuplicateProducts() {
        Product product = product(1L, 1L);

        assertThatThrownBy(() -> curation(List.of(product, product)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private static Curation curation(List<Product> products) {
        return new Curation(
            12L,
            "제목",
            "간단 설명",
            "상세 설명",
            List.of("https://example.com/main.png"),
            List.of(new Category(1L, null, "스킨케어", 0)),
            products,
            CurationStatus.PUBLISHED
        );
    }

    private static Product product(Long id, Long... categoryIds) {
        Product product = mock(Product.class);
        Set<Long> matchedCategoryIds = Set.of(categoryIds);
        given(product.id()).willReturn(id);
        given(product.belongsToCategory(org.mockito.ArgumentMatchers.any()))
            .willAnswer(invocation -> matchedCategoryIds.contains(invocation.getArgument(0)));
        return product;
    }
}
