package com.poudy.product.domain.sensory;

import java.math.BigDecimal;
import java.util.Objects;

public final class SensoryConfidence {

    private static final BigDecimal MINIMUM = BigDecimal.ZERO;
    private static final BigDecimal MAXIMUM = BigDecimal.ONE;

    private final BigDecimal value;

    public SensoryConfidence(BigDecimal value) {
        if (value == null || value.compareTo(MINIMUM) < 0 || value.compareTo(MAXIMUM) > 0) {
            throw new IllegalArgumentException("감각 추론 신뢰도는 0부터 1까지여야 합니다.");
        }

        this.value = value.stripTrailingZeros();
    }

    public BigDecimal value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof SensoryConfidence that && value.compareTo(that.value) == 0;
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }
}
