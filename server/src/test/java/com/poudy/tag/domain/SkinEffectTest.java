package com.poudy.tag.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("피부 작용")
class SkinEffectTest {

    @Test
    @DisplayName("ID가 없거나 코드와 표시 이름이 비어 있으면 만들 수 없다")
    void rejectsInvalidValues() {
        assertThatThrownBy(() -> new SkinEffect(null, "HYDRATION_RELATED", "피부 수분 관련"))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("피부 작용 ID가 필요합니다.");
        assertThatThrownBy(() -> new SkinEffect(1L, " ", "피부 수분 관련"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("피부 작용 코드가 필요합니다.");
        assertThatThrownBy(() -> new SkinEffect(1L, "HYDRATION_RELATED", " "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("피부 작용 표시 이름이 필요합니다.");
    }
}
