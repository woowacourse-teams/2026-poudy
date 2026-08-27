package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("감각 추론 신뢰도")
public class SensoryConfidenceTest {

    @ParameterizedTest
    @ValueSource(strings = {"0", "0.5", "1"})
    @DisplayName("0부터 1까지의 값을 보관한다")
    public void acceptsValueInRange(String value) {
        assertThat(new SensoryConfidence(new BigDecimal(value)).value())
            .isEqualByComparingTo(value);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"-0.01", "1.01"})
    @DisplayName("값이 없거나 0부터 1까지가 아니면 거부한다")
    public void rejectsMissingOrOutOfRangeValue(String value) {
        BigDecimal confidence = decimalOf(value);

        assertThatThrownBy(() -> new SensoryConfidence(confidence))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("감각 추론 신뢰도는 0부터 1까지여야 합니다.");
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.0", "0.50", "1.000"})
    @DisplayName("소수 자릿수가 다른 같은 값은 동일한 신뢰도이다")
    public void normalizesScaleForEquality(String value) {
        SensoryConfidence confidence = new SensoryConfidence(new BigDecimal(value));
        SensoryConfidence canonical = new SensoryConfidence(new BigDecimal(value).stripTrailingZeros());

        assertThat(confidence)
            .isEqualTo(canonical)
            .hasSameHashCodeAs(canonical);
    }

    private static BigDecimal decimalOf(String value) {
        if (value == null) {
            return null;
        }

        return new BigDecimal(value);
    }
}
