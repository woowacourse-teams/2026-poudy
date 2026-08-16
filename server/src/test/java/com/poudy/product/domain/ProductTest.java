package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품")
class ProductTest {

    private final Brand brand = new Brand(1L, "브랜드", null, null);
    private final Category category = new Category(2L, 1L, "카테고리", 1, null, null);
    private final Ingredients ingredients = new Ingredients(List.of());

    @Test
    @DisplayName("브랜드가 없으면 만들 수 없다")
    void rejectsMissingBrand() {
        assertThatThrownBy(() -> new Product(1L, null, category, "제품", ingredients))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품은 브랜드를 가져야 합니다.");
    }

    @Test
    @DisplayName("카테고리가 없으면 만들 수 없다")
    void rejectsMissingCategory() {
        assertThatThrownBy(() -> new Product(1L, brand, null, "제품", ingredients))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품은 카테고리를 가져야 합니다.");
    }
}
