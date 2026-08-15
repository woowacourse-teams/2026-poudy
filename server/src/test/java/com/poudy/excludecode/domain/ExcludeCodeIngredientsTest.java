package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("제외 성분군 성분")
class ExcludeCodeIngredientsTest {

    @Autowired
    private ExcludeCodeIngredients excludeCodeIngredients;

    @Test
    @DisplayName("고정 목록의 합성 색소 84개를 실제 성분으로 해석한다")
    void resolvesFixedSyntheticColorants() {
        assertThat(excludeCodeIngredients.of(ExcludeCode.SYNTHETIC_COLORANTS)).hasSize(84)
                .extracting(ExcludeCodeIngredient::koreanName).contains("황색4호", "적색103호의(1)", "염기성황색57호", "피그먼트녹색7호");
    }
}
