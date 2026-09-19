package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 카탈로그")
class IngredientCatalogTest {

    private static Ingredient ingredient(Long id) {
        return new Ingredient(id, "성분 " + id, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("주어진 ID에 해당하는 성분만 카탈로그 순서대로 남긴다")
    void retainsIngredientsInCatalogOrder() {
        IngredientCatalog catalog = IngredientCatalog.from(List.of(ingredient(1L), ingredient(2L), ingredient(3L)));

        IngredientPage page = catalog.retainIds(Set.of(3L, 1L, 999L)).page(1, 10);

        assertThat(page.items()).extracting(Ingredient::id).containsExactly(1L, 3L);
        assertThat(page.totalElements()).isEqualTo(2);
    }
}
