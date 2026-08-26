package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 목록")
class IngredientsTest {

    @Test
    @DisplayName("이름이 다른 성분의 영문명과 겹치면 한글명 일치를 고른다")
    void prefersKoreanNameOverEnglishName() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(10L, "정제수", "향료"), ingredient(20L, "향료", "Fragrance")));

        assertThat(ingredients.findByName("향료")).map(Ingredient::id).contains(20L);
    }

    @Test
    @DisplayName("한글명으로 찾지 못하면 영문명을 대소문자 없이 맞춘다")
    void fallsBackToEnglishName() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "글리세린", "Glycerin")));

        assertThat(ingredients.findByName("GLYCERIN")).map(Ingredient::id).contains(10L);
    }

    @Test
    @DisplayName("같은 이름을 가진 성분이 여럿이면 ID 가 작은 성분을 고른다")
    void picksSmallestIdAmongSameNames() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(30L, "향료", "Fragrance"), ingredient(20L, "향료", "Parfum")));

        assertThat(ingredients.findByName("향료")).map(Ingredient::id).contains(20L);
    }

    @Test
    @DisplayName("영문명이 없는 성분은 빈 이름으로 찾히지 않는다")
    void doesNotMatchEmptyName() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "정제수", null)));

        assertThat(ingredients.findByName("")).isEmpty();
    }

    @Test
    @DisplayName("찾지 못한 ID 는 결과에서 뺀다")
    void skipsUnknownIds() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "글리세린", "Glycerin")));

        Ingredients found = ingredients.findAllById(List.of(10L, 999L));

        assertThat(found.findById(10L)).isPresent();
        assertThat(found.findById(999L)).isEmpty();
    }

    @Test
    @DisplayName("골라낸 성분 목록도 검색할 수 있다")
    void searchesWithinSelectedIngredients() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(10L, "글리세린", "Glycerin"), ingredient(20L, "향료", "Fragrance")));

        Ingredients found = ingredients.findAllById(List.of(10L));

        assertThat(found.search("글리")).map(Ingredient::id).containsExactly(10L);
        assertThat(found.search("향료")).isEmpty();
    }

    @Test
    @DisplayName("요청한 페이지의 성분과 전체 개수를 함께 반환한다")
    void pagesIngredients() {
        Ingredients ingredients = new Ingredients(
                List.of(
                        ingredient(10L, "글리세린", "Glycerin"),
                        ingredient(20L, "향료", "Fragrance"),
                        ingredient(30L, "정제수", "Water")));

        IngredientPage page = ingredients.page(1, 2);

        assertThat(page.items()).map(Ingredient::id).containsExactly(30L);
        assertThat(page.totalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("페이지 조건이 올바르지 않으면 거절한다")
    void rejectsInvalidPageCondition() {
        Ingredients ingredients = new Ingredients(List.of());

        assertThatThrownBy(() -> ingredients.page(-1, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ingredients.page(0, 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("요청한 성분을 모두 포함하는지 판단한다")
    void checksContainingAllIngredients() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(10L, "글리세린", "Glycerin"), ingredient(20L, "향료", "Fragrance")));

        assertThat(ingredients.containsAll(List.of(10L, 20L))).isTrue();
        assertThat(ingredients.containsAll(List.of(10L, 30L))).isFalse();
        assertThat(ingredients.containsAll(List.of())).isTrue();
    }

    @Test
    @DisplayName("요청한 성분 중 하나라도 포함하는지 판단한다")
    void checksContainingAnyIngredient() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(10L, "글리세린", "Glycerin"), ingredient(20L, "향료", "Fragrance")));

        assertThat(ingredients.containsAny(List.of(20L, 30L))).isTrue();
        assertThat(ingredients.containsAny(List.of(30L, 40L))).isFalse();
        assertThat(ingredients.containsAny(List.of())).isFalse();
    }

    private static Ingredient ingredient(Long id, String koreanName, String englishName) {
        return new Ingredient(id, koreanName, englishName, null, null, null, null, null, null, null);
    }
}
