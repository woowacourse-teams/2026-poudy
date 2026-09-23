package com.poudy.ingredient.domain;

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
            ExcludeCode.SYNTHETIC_COLORANTS
        );
    }

    @Test
    void 각_제외_성분군은_표시명과_설명을_가진다() {
        assertThat(Arrays.stream(ExcludeCode.values()).map(ExcludeCode::displayName))
            .containsExactly(
                "향료/알레르기 성분",
                "건조 알코올",
                "자극성 방부제",
                "설페이트 성분",
                "실리콘 자극원",
                "합성 색소"
            );
        assertThat(Arrays.asList(ExcludeCode.values())).allSatisfy(code -> {
            assertThat(code.description()).isNotBlank();
        });
    }
}
