package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;

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

    private static Ingredient ingredient(Long id, String koreanName, String englishName) {
        return new Ingredient(id, koreanName, englishName, null, null, null, null, null, null, null);
    }
}
