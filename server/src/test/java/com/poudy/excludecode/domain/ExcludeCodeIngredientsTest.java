package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("제외 성분군 성분")
class ExcludeCodeIngredientsTest {

    @Autowired
    private ExcludeCodeIngredients excludeCodeIngredients;

    @ParameterizedTest
    @EnumSource(ExcludeCode.class)
    @DisplayName("고정 성분명을 모두 같은 한글명의 성분으로 순서대로 해석한다")
    void resolvesEveryFixedName(ExcludeCode code) {
        assertThat(excludeCodeIngredients.of(code)).extracting(ExcludeCodeIngredient::koreanName)
                .containsExactlyElementsOf(code.ingredientNames());
    }

    @ParameterizedTest
    @EnumSource(ExcludeCode.class)
    @DisplayName("해석한 성분은 모두 자기 성분군을 되돌려준다")
    void mapsResolvedIngredientBackToCode(ExcludeCode code) {
        assertThat(excludeCodeIngredients.of(code))
                .allSatisfy(ingredient -> assertThat(excludeCodeIngredients.codesOf(ingredient.id())).contains(code));
    }
}
