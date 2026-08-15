package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 검색 순서")
class IngredientSearchOrderTest {

    @Test
    @DisplayName("정확히 같은 이름, 검색어로 시작하는 이름, 나머지 순으로 담는다")
    void ordersByHowWellNameMatches() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(10L, "메틸프로판다이올"), ingredient(20L, "판테놀"), ingredient(30L, "판")));

        assertThat(names(ingredients.search("판"))).containsExactly("판", "판테놀", "메틸프로판다이올");
    }

    @Test
    @DisplayName("같은 등급이면 ID 가 작은 성분을 먼저 담는다")
    void ordersSameRankById() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(30L, "판토테닉애씨드"), ingredient(20L, "판테놀"), ingredient(10L, "메틸프로판다이올")));

        assertThat(names(ingredients.search("판"))).containsExactly("판테놀", "판토테닉애씨드", "메틸프로판다이올");
    }

    @Test
    @DisplayName("초성 검색도 같은 순서를 따른다")
    void ordersChosungSearch() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "메틸판테놀에스터"), ingredient(20L, "판테놀")));

        assertThat(names(ingredients.search("ㅍㅌㄴ"))).containsExactly("판테놀", "메틸판테놀에스터");
    }

    @Test
    @DisplayName("별칭으로만 걸린 성분은 이름으로 걸린 성분보다 뒤에 담는다")
    void ordersAliasMatchLast() {
        Ingredients ingredients = new Ingredients(
                List.of(ingredient(10L, "백혈구추출물", "류코사이트추출물"), ingredient(20L, "류코노스톡발효물")));

        assertThat(names(ingredients.search("류코"))).containsExactly("류코노스톡발효물", "백혈구추출물");
    }

    @Test
    @DisplayName("이름으로 걸렸으면 별칭이 함께 걸려도 순서가 앞당겨지지 않는다")
    void aliasDoesNotPromoteNameMatch() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "판테놀"), ingredient(20L, "판테닐에틸에터", "판테닐에터")));

        assertThat(names(ingredients.search("판"))).containsExactly("판테놀", "판테닐에틸에터");
    }

    private static List<String> names(List<Ingredient> found) {
        return found.stream().map(Ingredient::koreanName).toList();
    }

    private static Ingredient ingredient(Long id, String koreanName, String... aliases) {
        return new Ingredient(id, koreanName, "", null, null, null, List.of(aliases), null, null, null);
    }
}
