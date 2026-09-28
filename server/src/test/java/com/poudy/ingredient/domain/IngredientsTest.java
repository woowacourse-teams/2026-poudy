package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 목록")
class IngredientsTest {

    @Test
    @DisplayName("찾지 못한 ID 는 결과에서 빼고 요청 순서를 지킨다")
    void resolvesKnownIdsInRequestedOrder() {
        IngredientCatalog ingredients = IngredientCatalog.from(
            List.of(ingredient(10L, "글리세린", "Glycerin"), ingredient(20L, "향료", "Fragrance"))
        );

        assertThat(ingredients.resolveInOrder(List.of(20L, 999L, 10L)).values())
            .extracting(Ingredient::id)
            .containsExactly(20L, 10L);
    }

    @Test
    @DisplayName("카탈로그는 같은 ID의 성분을 허용하지 않는다")
    void rejectsDuplicateCatalogIds() {
        assertThatThrownBy(
            () -> IngredientCatalog.from(
                List.of(ingredient(10L, "글리세린", "Glycerin"), ingredient(10L, "향료", "Fragrance"))
            )
        )
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("10");
    }

    @Test
    @DisplayName("제품 전성분은 입력 순서와 중복을 보존한다")
    void keepsProductIngredientOrderAndDuplicates() {
        Ingredient first = ingredient(10L, "글리세린", "Glycerin");
        Ingredient second = ingredient(20L, "향료", "Fragrance");

        Ingredients ingredients = new Ingredients(List.of(first, second, first));

        assertThat(ingredients.values()).containsExactly(first, second, first);
    }

    @Test
    @DisplayName("요청한 성분을 모두 포함하는지 판단한다")
    void checksContainingAllIngredients() {
        Ingredients ingredients = new Ingredients(
            List.of(ingredient(10L, "글리세린", "Glycerin"), ingredient(20L, "향료", "Fragrance"))
        );

        assertThat(ingredients.containsAll(List.of(10L, 20L))).isTrue();
        assertThat(ingredients.containsAll(List.of(10L, 30L))).isFalse();
        assertThat(ingredients.containsAll(List.of())).isTrue();
    }

    @Test
    @DisplayName("요청한 성분 중 하나라도 포함하는지 판단한다")
    void checksContainingAnyIngredient() {
        Ingredients ingredients = new Ingredients(
            List.of(ingredient(10L, "글리세린", "Glycerin"), ingredient(20L, "향료", "Fragrance"))
        );

        assertThat(ingredients.containsAny(List.of(20L, 30L))).isTrue();
        assertThat(ingredients.containsAny(List.of(30L, 40L))).isFalse();
        assertThat(ingredients.containsAny(List.of())).isFalse();
    }

    private static Ingredient ingredient(Long id, String koreanName, String englishName) {
        return new Ingredient(id, koreanName, englishName, null, null, null, null, null);
    }
}
