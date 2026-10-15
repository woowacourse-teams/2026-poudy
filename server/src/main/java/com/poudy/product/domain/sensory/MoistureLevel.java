package com.poudy.product.domain.sensory;

public final class MoistureLevel {

    private static final double MINIMUM = 0;
    private static final double MAXIMUM = 3;
    private static final double STEPS_PER_UNIT = 2;

    private final double value;

    public MoistureLevel(double value) {
        if (value < MINIMUM || value > MAXIMUM) {
            throw new IllegalArgumentException("수분감 단계는 0부터 3까지여야 합니다.");
        }
        this.value = Math.round(value * STEPS_PER_UNIT) / STEPS_PER_UNIT;
    }

    public double value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof MoistureLevel that && value == that.value;
    }

    @Override
    public int hashCode() {
        return Double.hashCode(value);
    }
}
