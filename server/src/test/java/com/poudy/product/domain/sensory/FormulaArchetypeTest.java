package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제형 유형")
public class FormulaArchetypeTest {

    @Test
    @DisplayName("감각 추론 계약의 제형 유형만 제공한다")
    public void providesEveryFormulaArchetype() {
        assertThat(Arrays.stream(FormulaArchetype.values()).map(Enum::name))
                .containsExactlyInAnyOrder(
                        "AQUEOUS_SOLUTION",
                        "HYDROGEL",
                        "O_W_EMULSION",
                        "W_O_EMULSION",
                        "ALCOHOL_RICH_SOLUTION",
                        "ANHYDROUS_OIL",
                        "BALM_OR_WAX",
                        "POWDER_RICH_SUSPENSION",
                        "UNKNOWN");
    }
}
