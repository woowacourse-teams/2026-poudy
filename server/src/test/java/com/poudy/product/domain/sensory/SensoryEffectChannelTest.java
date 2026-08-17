package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("감각 효과 채널")
public class SensoryEffectChannelTest {

    @Test
    @DisplayName("감각 프로필 계약의 효과 채널만 제공한다")
    public void providesEverySensoryEffectChannel() {
        assertThat(Arrays.stream(SensoryEffectChannel.values()).map(Enum::name))
                .containsExactlyInAnyOrder(
                        "AFTERFEEL_MOISTURE",
                        "AFTERFEEL_OILINESS",
                        "RHEOLOGY",
                        "FILM_FORMATION");
    }
}
