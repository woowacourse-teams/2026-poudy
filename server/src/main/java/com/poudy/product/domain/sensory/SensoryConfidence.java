package com.poudy.product.domain.sensory;

import java.math.BigDecimal;

public record SensoryConfidence(BigDecimal value) {

    private static final BigDecimal MINIMUM = BigDecimal.ZERO;
    private static final BigDecimal MAXIMUM = BigDecimal.ONE;

    public SensoryConfidence {
        if (value == null || value.compareTo(MINIMUM) < 0 || value.compareTo(MAXIMUM) > 0) {
            throw new IllegalArgumentException("감각 추론 신뢰도는 0부터 1까지여야 합니다.");
        }

        value = value.stripTrailingZeros();
    }
}
