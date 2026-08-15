package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ExcludeCodeTest {

    @Test
    void 각_제외_성분군은_표시명과_설명을_가진다() {
        assertThat(Arrays.asList(ExcludeCode.values())).allSatisfy(code -> {
            assertThat(code.displayName()).isNotBlank();
            assertThat(code.description()).isNotBlank();
        });
    }

    @Test
    void 고정_성분명은_해당_제외_성분군이_가진다() {
        assertThat(ExcludeCode.FRAGRANCE_ALLERGENS.ingredientNames()).contains("향료", "리날룰");
        assertThat(ExcludeCode.DRYING_ALCOHOLS.ingredientNames()).contains("변성알코올", "에탄올");
        assertThat(ExcludeCode.SYNTHETIC_COLORANTS.ingredientNames()).isEmpty();
    }
}
