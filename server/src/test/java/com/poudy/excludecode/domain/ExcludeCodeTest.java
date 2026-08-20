package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ExcludeCodeTest {

    @Test
    void 빠른_제외_성분군은_승인한_여섯_개를_선언_순서대로_가진다() {
        assertThat(ExcludeCode.values()).containsExactly(
                ExcludeCode.FRAGRANCE_ALLERGENS,
                ExcludeCode.DRYING_ALCOHOLS,
                ExcludeCode.HARSH_PRESERVATIVES,
                ExcludeCode.SULFATES,
                ExcludeCode.CYCLIC_SILICONES,
                ExcludeCode.SYNTHETIC_COLORANTS);
    }

    @Test
    void 각_제외_성분군은_표시명과_설명을_가진다() {
        assertThat(Arrays.asList(ExcludeCode.values())).allSatisfy(code -> {
            assertThat(code.displayName()).isNotBlank();
            assertThat(code.description()).isNotBlank();
        });
    }
}
