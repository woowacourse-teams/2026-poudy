package com.poudy.tag.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("배합 목적")
class FormulationRoleTest {

    @Test
    @DisplayName("ID가 없거나 코드와 표시 이름이 비어 있으면 만들 수 없다")
    void rejectsInvalidValues() {
        assertThatThrownBy(() -> new FormulationRole(null, "HUMECTANT", "습윤제"))
            .isInstanceOf(NullPointerException.class)
            .hasMessage("배합 목적 ID가 필요합니다.");
        assertThatThrownBy(() -> new FormulationRole(1L, " ", "습윤제"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("배합 목적 코드가 필요합니다.");
        assertThatThrownBy(() -> new FormulationRole(1L, "HUMECTANT", " "))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("배합 목적 표시 이름이 필요합니다.");
    }
}
