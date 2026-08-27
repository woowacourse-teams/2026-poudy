package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("유분감 단계")
public class OilLevelTest {

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 3})
    @DisplayName("0부터 3까지의 단계를 보관한다")
    public void acceptsLevelInRange(int value) {
        assertThat(new OilLevel(value).value()).isEqualTo(value);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 4})
    @DisplayName("0부터 3까지가 아닌 단계는 거부한다")
    public void rejectsLevelOutOfRange(int value) {
        assertThatThrownBy(() -> new OilLevel(value))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("유분감 단계는 0부터 3까지여야 합니다.");
    }
}
