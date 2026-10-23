package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeSummary;
import com.poudy.search.domain.MatchRange;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 검색 제안")
class IngredientSuggestionTest {

    @Test
    @DisplayName("원문 밖의 검색 구간은 기존 예외와 메시지로 거절한다")
    void rejectsRangeBeyondSourceText() {
        assertThatThrownBy(
            () -> new IngredientSuggestion(ingredient(), IngredientMatchField.KOREAN_NAME, "리날룰", new MatchRange(0, 4))
        )
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("성분 검색 일치 구간이 원문 범위를 벗어났습니다.");
    }

    @Test
    @DisplayName("검색 구간이 원문 끝까지 포함하면 제안을 생성한다")
    void acceptsRangeEndingAtSourceTextBoundary() {
        assertThatCode(
            () -> new IngredientSuggestion(ingredient(), IngredientMatchField.KOREAN_NAME, "리날룰", new MatchRange(0, 3))
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("제외 성분군을 교체해도 기존 제안과 검색 일치 정보는 유지한다")
    void replacesGroupsWithoutChangingTheOriginalSuggestionOrMatch() {
        ExcludeCodeSummary fragrance = new ExcludeCodeSummary(ExcludeCode.FRAGRANCE_ALLERGENS, "향료/알레르기 성분");
        ExcludeCodeSummary preservative = new ExcludeCodeSummary(ExcludeCode.HARSH_PRESERVATIVES, "자극성 방부제");
        List<ExcludeCodeSummary> originalGroups = new ArrayList<>(List.of(fragrance));
        IngredientSuggestion original = new IngredientSuggestion(
            ingredient(),
            IngredientMatchField.ALIAS,
            "검증리날룰",
            new MatchRange(2, 5),
            originalGroups
        );
        List<ExcludeCodeSummary> replacementGroups = new ArrayList<>(List.of(preservative));

        IngredientSuggestion replaced = original.withExcludeGroups(replacementGroups);
        originalGroups.clear();
        replacementGroups.clear();

        assertThat(original.excludeGroups()).containsExactly(fragrance);
        assertThat(replaced.excludeGroups()).containsExactly(preservative);
        assertThat(replaced.ingredientId()).isEqualTo(9L);
        assertThat(replaced.ingredient()).isSameAs(original.ingredient());
        assertThat(replaced.field()).isEqualTo(IngredientMatchField.ALIAS);
        assertThat(replaced.text()).isEqualTo("검증리날룰");
        assertThat(replaced.range()).isSameAs(original.range());
        IngredientSuggestion cleared = replaced.withExcludeGroups(List.of());
        assertThat(cleared.excludeGroups()).isEmpty();
        assertThat(replaced.excludeGroups()).containsExactly(preservative);
    }

    private static Ingredient ingredient() {
        return Ingredient.create(9L, "리날룰", "Linalool", null, null, null, null, null);
    }
}
