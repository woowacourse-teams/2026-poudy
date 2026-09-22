package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientCatalog;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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

    private static Map<ExcludeCode, List<Long>> everyCodeWith(List<Long> ingredientIds) {
        Map<ExcludeCode, List<Long>> ingredientIdsByCode = new EnumMap<>(ExcludeCode.class);
        Arrays.stream(ExcludeCode.values()).forEach(code -> ingredientIdsByCode.put(code, ingredientIds));
        return ingredientIdsByCode;
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
        Map<ExcludeCode, List<Long>> withoutSulfates = everyCodeWith(List.of(10L));
        withoutSulfates.remove(ExcludeCode.SULFATES);

        assertThatThrownBy(() -> ExcludeCodeIngredients.from(withoutSulfates, ingredientsOf(10L)))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class)
            .hasMessageContaining(ExcludeCode.SULFATES.name());
    }

    @Test
    @DisplayName("성분이 하나도 없는 성분군이 있으면 만들 수 없다")
    void rejectsEmptyCode() {
        Map<ExcludeCode, List<Long>> withEmptySulfates = everyCodeWith(List.of(10L));
        withEmptySulfates.put(ExcludeCode.SULFATES, List.of());

        assertThatThrownBy(() -> ExcludeCodeIngredients.from(withEmptySulfates, ingredientsOf(10L)))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class)
            .hasMessageContaining(ExcludeCode.SULFATES.name());
    }

    @Test
    @DisplayName("찾을 수 없는 성분 ID 가 있으면 만들 수 없다")
    void rejectsUnknownIngredientId() {
        assertThatThrownBy(() -> ExcludeCodeIngredients.from(everyCodeWith(List.of(10L, 999L)), ingredientsOf(10L)))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class)
            .hasMessageContaining("999");
    }
}
