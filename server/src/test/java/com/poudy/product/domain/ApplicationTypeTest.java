package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 적용 방식")
public class ApplicationTypeTest {

    @Test
    @DisplayName("원천 데이터 계약의 적용 방식만 제공한다")
    public void providesEveryApplicationType() {
        assertThat(Arrays.stream(ApplicationType.values()).map(Enum::name))
                .containsExactlyInAnyOrder("LEAVE_ON", "RINSE_OFF", "UNKNOWN");
    }
}
