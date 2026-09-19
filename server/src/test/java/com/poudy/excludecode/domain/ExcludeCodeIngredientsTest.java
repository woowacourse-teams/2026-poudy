package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientCatalog;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제외 성분군 성분")
class ExcludeCodeIngredientsTest {

    private static IngredientCatalog ingredientsOf(Long... ids) {
        List<Ingredient> values = Arrays.stream(ids)
            .map(id -> new Ingredient(id, "성분 " + id, null, null, null, null, null, null))
            .toList();

        return IngredientCatalog.from(values);
    }

    private static List<ExcludeCodeMapping> everyCodeWith(List<Long> ingredientIds) {
        return Arrays.stream(ExcludeCode.values())
            .map(code -> new ExcludeCodeMapping(code, ingredientIds))
            .toList();
    }

    @Test
    @DisplayName("데이터의 성분 ID 순서를 그대로 유지한다")
    void keepsIngredientOrderOfData() {
        ExcludeCodeIngredients resolved = ExcludeCodeIngredients.from(
            everyCodeWith(List.of(30L, 10L, 20L)),
            ingredientsOf(10L, 20L, 30L)
        );

        assertThat(resolved.of(ExcludeCode.SULFATES)).extracting(ExcludeCodeIngredient::id)
            .containsExactly(30L, 10L, 20L);
    }

    @Test
    @DisplayName("성분군 정의가 빠지면 만들 수 없다")
    void rejectsUndefinedCode() {
        List<ExcludeCodeMapping> withoutSulfates = everyCodeWith(List.of(10L)).stream()
            .filter(mapping -> mapping.code() != ExcludeCode.SULFATES)
            .toList();

        assertThatThrownBy(() -> ExcludeCodeIngredients.from(withoutSulfates, ingredientsOf(10L)))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class)
            .hasMessageContaining(ExcludeCode.SULFATES.name());
    }

    @Test
    @DisplayName("성분군 정의가 중복되면 만들 수 없다")
    void rejectsDuplicatedCode() {
        List<ExcludeCodeMapping> duplicated = new java.util.ArrayList<>(everyCodeWith(List.of(10L)));
        duplicated.add(new ExcludeCodeMapping(ExcludeCode.SULFATES, List.of(10L)));

        assertThatThrownBy(() -> ExcludeCodeIngredients.from(duplicated, ingredientsOf(10L)))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class)
            .hasMessageContaining(ExcludeCode.SULFATES.name());
    }

    @Test
    @DisplayName("성분이 하나도 없는 성분군이 있으면 만들 수 없다")
    void rejectsEmptyCode() {
        List<ExcludeCodeMapping> withEmptySulfates = everyCodeWith(List.of(10L)).stream()
            .map(ExcludeCodeIngredientsTest::emptiedWhenSulfates)
            .toList();

        assertThatThrownBy(() -> ExcludeCodeIngredients.from(withEmptySulfates, ingredientsOf(10L)))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class)
            .hasMessageContaining(ExcludeCode.SULFATES.name());
    }

    private static ExcludeCodeMapping emptiedWhenSulfates(ExcludeCodeMapping mapping) {
        if (mapping.code() == ExcludeCode.SULFATES) {
            return new ExcludeCodeMapping(ExcludeCode.SULFATES, List.of());
        }

        return mapping;
    }

    @Test
    @DisplayName("찾을 수 없는 성분 ID 가 있으면 만들 수 없다")
    void rejectsUnknownIngredientId() {
        assertThatThrownBy(() -> ExcludeCodeIngredients.from(everyCodeWith(List.of(10L, 999L)), ingredientsOf(10L)))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class)
            .hasMessageContaining("999");
    }
}
