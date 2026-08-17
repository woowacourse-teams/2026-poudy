package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("감각 원천 조성 수치")
class ExactCompositionValuesTest {

    @Test
    @DisplayName("처방 투입량은 0부터 100까지의 정확한 BigDecimal이다")
    void validatesMassPercentRange() {
        assertThat(MassPercent.parse("12.500")).isEqualTo(new MassPercent(new BigDecimal("12.5")));
        assertThat(MassPercent.parse("0").value()).isEqualByComparingTo("0");
        assertThat(MassPercent.parse("100").value()).isEqualByComparingTo("100");
        assertThatThrownBy(() -> MassPercent.parse("-0.01"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MassPercent.parse("100.01"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("복합원료 내부 구성비는 0부터 1까지이며 백분율과 다른 타입이다")
    void validatesComponentFractionRange() {
        assertThat(ComponentFraction.parse("0.2500"))
                .isEqualTo(new ComponentFraction(new BigDecimal("0.25")));
        assertThat(ComponentFraction.parse("0").value()).isEqualByComparingTo("0");
        assertThat(ComponentFraction.parse("1").value()).isEqualByComparingTo("1");
        assertThatThrownBy(() -> ComponentFraction.parse("-0.01"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ComponentFraction.parse("1.01"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("수치 입력은 유효한 십진수 문자열이어야 한다")
    void rejectsInvalidDecimalStrings() {
        assertThatThrownBy(() -> MassPercent.parse(" "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ComponentFraction.parse("one half"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
