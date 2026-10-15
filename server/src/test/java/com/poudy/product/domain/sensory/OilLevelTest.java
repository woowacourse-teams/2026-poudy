package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("유분감 단계")
public class OilLevelTest {

    @ParameterizedTest
    @CsvSource({"0,0", "0.24,0", "0.25,0.5", "2.37,2.5", "2.74,2.5", "2.75,3", "3,3"})
    @DisplayName("0부터 3까지의 값을 0.5 단위로 반올림한다")
    public void roundsToHalfStep(double value, double expected) {
        assertThat(new OilLevel(value).value()).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(doubles = {-0.01, 3.01})
    @DisplayName("0부터 3까지가 아닌 단계는 거부한다")
    public void rejectsLevelOutOfRange(double value) {
        assertThatThrownBy(() -> new OilLevel(value))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("유분감 단계는 0부터 3까지여야 합니다.");
    }
}
