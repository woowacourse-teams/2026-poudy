package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 검색 순서와 상한")
class IngredientSearchOrderTest {

    @Test
    @DisplayName("정확히 같은 이름, 검색어로 시작하는 이름, 나머지 순으로 담는다")
    void ordersByHowWellNameMatches() {
        Ingredients ingredients = new Ingredients(
            List.of(ingredient(10L, "메틸프로판다이올"), ingredient(20L, "판테놀"), ingredient(30L, "판"))
        );

        assertThat(names(ingredients.search("판"))).containsExactly("판", "판테놀", "메틸프로판다이올");
    }

    @Test
    @DisplayName("같은 등급이면 ID 가 작은 성분을 먼저 담는다")
    void ordersSameRankById() {
        Ingredients ingredients = new Ingredients(
            List.of(ingredient(30L, "판토테닉애씨드"), ingredient(20L, "판테놀"), ingredient(10L, "메틸프로판다이올"))
        );

        assertThat(names(ingredients.search("판"))).containsExactly("판테놀", "판토테닉애씨드", "메틸프로판다이올");
    }

    @Test
    @DisplayName("초성 검색도 같은 순서를 따른다")
    void ordersChosungSearch() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "메틸판테놀에스터"), ingredient(20L, "판테놀")));

        assertThat(names(ingredients.search("ㅍㅌㄴ"))).containsExactly("판테놀", "메틸판테놀에스터");
    }

    @Test
    @DisplayName("같은 등급이면 여러 성분을 `/`로 묶은 이름을 뒤에 담는다")
    void ordersCombinedNameLast() {
        Ingredients ingredients = new Ingredients(
            List.of(ingredient(10L, "글리세린/프탈릭애씨드코폴리머"), ingredient(20L, "글리세린다이메틸에터"))
        );

        assertThat(names(ingredients.search("글리세린"))).containsExactly("글리세린다이메틸에터", "글리세린/프탈릭애씨드코폴리머");
    }

    @Test
    @DisplayName("`/`로 묶은 이름이라도 더 잘 맞으면 먼저 담는다")
    void combinedNameKeepsBetterMatch() {
        Ingredients ingredients = new Ingredients(
            List.of(ingredient(10L, "다이글리세린"), ingredient(20L, "글리세린/프탈릭애씨드코폴리머"))
        );

        assertThat(names(ingredients.search("글리세린"))).containsExactly("글리세린/프탈릭애씨드코폴리머", "다이글리세린");
    }

    @Test
    @DisplayName("별칭으로만 걸린 성분은 이름으로 걸린 성분보다 뒤에 담는다")
    void ordersAliasMatchLast() {
        Ingredients ingredients = new Ingredients(
            List.of(ingredient(10L, "백혈구추출물", "류코사이트추출물"), ingredient(20L, "류코노스톡발효물"))
        );

        assertThat(names(ingredients.search("류코"))).containsExactly("류코노스톡발효물", "백혈구추출물");
    }

    @Test
    @DisplayName("이름으로 걸렸으면 별칭이 함께 걸려도 순서가 앞당겨지지 않는다")
    void aliasDoesNotPromoteNameMatch() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "판테놀"), ingredient(20L, "판테닐에틸에터", "판테닐에터")));

        assertThat(names(ingredients.search("판"))).containsExactly("판테놀", "판테닐에틸에터");
    }

    @Test
    @DisplayName("걸린 성분이 많아도 최대 5건만 담는다")
    void limitsSearchResult() {
        Ingredients ingredients = new Ingredients(
            IntStream.rangeClosed(1, 20)
                .mapToObj(index -> ingredient((long) index, "판테놀" + index))
                .toList()
        );

        assertThat(ingredients.search("판테놀")).hasSize(Ingredients.SEARCH_RESULT_LIMIT);
    }

    @Test
    @DisplayName("상한은 정렬한 뒤에 걸어 가장 잘 맞는 성분부터 남긴다")
    void keepsBestMatchesWithinLimit() {
        Ingredients ingredients = new Ingredients(
            List.of(
                ingredient(10L, "메틸판테놀에스터"),
                ingredient(20L, "다이판테놀"),
                ingredient(30L, "하이드록시판테놀"),
                ingredient(40L, "아세틸판테놀"),
                ingredient(50L, "소듐판테놀포스페이트"),
                ingredient(60L, "판테놀")
            )
        );

        assertThat(names(ingredients.search("판테놀")))
            .containsExactly("판테놀", "메틸판테놀에스터", "다이판테놀", "하이드록시판테놀", "아세틸판테놀");
    }

    @Test
    @DisplayName("걸린 성분이 상한보다 적으면 걸린 만큼만 담는다")
    void keepsEveryMatchBelowLimit() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(10L, "판테놀"), ingredient(20L, "다이판테놀")));

        assertThat(ingredients.search("판테놀")).hasSize(2);
    }

    private static List<String> names(List<Ingredient> found) {
        return found.stream().map(Ingredient::koreanName).toList();
    }

    private static Ingredient ingredient(Long id, String koreanName, String... aliases) {
        return new Ingredient(id, koreanName, "", null, null, null, List.of(aliases), null, null, null);
    }
}
