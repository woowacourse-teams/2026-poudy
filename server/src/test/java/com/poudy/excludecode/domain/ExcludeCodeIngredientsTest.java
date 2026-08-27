package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("제외 성분군 성분")
class ExcludeCodeIngredientsTest {

    @Autowired
    private ExcludeCodeIngredients excludeCodeIngredients;

    private static Ingredients ingredientsOf(Long... ids) {
        List<Ingredient> values = Arrays.stream(ids)
                .map(id -> new Ingredient(id, "성분 " + id, null, null, null, null, null, null, null, null))
                .toList();

        return new Ingredients(values);
    }

    private static List<ExcludeCodeMapping> everyCodeWith(List<Long> ingredientIds) {
        return Arrays.stream(ExcludeCode.values())
                .map(code -> new ExcludeCodeMapping(code, ingredientIds))
                .toList();
    }

    @ParameterizedTest
    @EnumSource(ExcludeCode.class)
    @DisplayName("성분군마다 성분을 하나 이상 해석한다")
    void resolvesEveryCode(ExcludeCode code) {
        assertThat(excludeCodeIngredients.of(code)).isNotEmpty()
                .allSatisfy(ingredient -> assertThat(ingredient.koreanName()).isNotBlank());
    }

    @ParameterizedTest
    @EnumSource(ExcludeCode.class)
    @DisplayName("해석한 성분은 모두 자기 성분군을 되돌려준다")
    void mapsResolvedIngredientBackToCode(ExcludeCode code) {
        assertThat(excludeCodeIngredients.of(code))
                .allSatisfy(ingredient -> assertThat(excludeCodeIngredients.codesOf(ingredient.id())).contains(code));
    }

    @Test
    @DisplayName("데이터의 성분 ID 순서를 그대로 유지한다")
    void keepsIngredientOrderOfData() {
        ExcludeCodeIngredients resolved = new ExcludeCodeIngredients(
                everyCodeWith(List.of(30L, 10L, 20L)),
                ingredientsOf(10L, 20L, 30L));

        assertThat(resolved.of(ExcludeCode.SULFATES)).extracting(ExcludeCodeIngredient::id)
                .containsExactly(30L, 10L, 20L);
    }

    @Test
    @DisplayName("성분군 정의가 빠지면 만들 수 없다")
    void rejectsUndefinedCode() {
        List<ExcludeCodeMapping> withoutSulfates = everyCodeWith(List.of(10L)).stream()
                .filter(mapping -> mapping.code() != ExcludeCode.SULFATES)
                .toList();

        assertThatThrownBy(() -> new ExcludeCodeIngredients(withoutSulfates, ingredientsOf(10L)))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining(ExcludeCode.SULFATES.name());
    }

    @Test
    @DisplayName("성분군 정의가 중복되면 만들 수 없다")
    void rejectsDuplicatedCode() {
        List<ExcludeCodeMapping> duplicated = new java.util.ArrayList<>(everyCodeWith(List.of(10L)));
        duplicated.add(new ExcludeCodeMapping(ExcludeCode.SULFATES, List.of(10L)));

        assertThatThrownBy(() -> new ExcludeCodeIngredients(duplicated, ingredientsOf(10L)))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining(ExcludeCode.SULFATES.name());
    }

    @Test
    @DisplayName("성분이 하나도 없는 성분군이 있으면 만들 수 없다")
    void rejectsEmptyCode() {
        List<ExcludeCodeMapping> withEmptySulfates = everyCodeWith(List.of(10L)).stream()
                .map(ExcludeCodeIngredientsTest::emptiedWhenSulfates)
                .toList();

        assertThatThrownBy(() -> new ExcludeCodeIngredients(withEmptySulfates, ingredientsOf(10L)))
                .isInstanceOf(InfrastructureException.class)
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
        assertThatThrownBy(() -> new ExcludeCodeIngredients(everyCodeWith(List.of(10L, 999L)), ingredientsOf(10L)))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("999");
    }
}
