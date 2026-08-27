package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("수분감 단계")
public class MoistureLevelTest {

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 3})
    @DisplayName("0부터 3까지의 단계를 보관한다")
    public void acceptsLevelInRange(int value) {
        assertThat(new MoistureLevel(value).value()).isEqualTo(value);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 4})
    @DisplayName("0부터 3까지가 아닌 단계는 거부한다")
    public void rejectsLevelOutOfRange(int value) {
        assertThatThrownBy(() -> new MoistureLevel(value))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("수분감 단계는 0부터 3까지여야 합니다.");
    }
}
