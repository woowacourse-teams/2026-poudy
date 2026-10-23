package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("내게 안 맞는 성분")
class UnsuitableIngredientsTest {

    private final ProductPart part = new ProductPart(
        1L,
        null,
        new Ingredients(List.of(ingredient(10L), ingredient(20L)))
    );

    @Test
    @DisplayName("나만의 필터가 비어 있으면 비어 있다고 알리고 성분이 없다")
    void emptyFilter() {
        UnsuitableIngredients unsuitable = UnsuitableIngredients.of(part, List.of());

        assertThat(unsuitable.skinFilterEmpty()).isTrue();
        assertThat(unsuitable.values()).isEmpty();
    }

    @Test
    @DisplayName("필터 성분이 구성품에 없으면 성분 없이 필터는 비어 있지 않다")
    void noMatch() {
        UnsuitableIngredients unsuitable = UnsuitableIngredients.of(part, List.of(99L));

        assertThat(unsuitable.skinFilterEmpty()).isFalse();
        assertThat(unsuitable.values()).isEmpty();
    }

    @Test
    @DisplayName("구성품에 든 필터 성분만 담는다")
    void matches() {
        UnsuitableIngredients unsuitable = UnsuitableIngredients.of(part, List.of(20L, 99L));

        assertThat(unsuitable.values()).extracting(Ingredient::id).containsExactly(20L);
    }

    @Test
    @DisplayName("구성품이 없는 제품은 성분 없이 필터 상태만 알린다")
    void noPart() {
        UnsuitableIngredients unsuitable = UnsuitableIngredients.of(null, List.of(10L));

        assertThat(unsuitable.skinFilterEmpty()).isFalse();
        assertThat(unsuitable.values()).isEmpty();
    }

    private static Ingredient ingredient(Long id) {
        return Ingredient.create(id, "성분 " + id, null, null, null, null, null, null);
    }
}
