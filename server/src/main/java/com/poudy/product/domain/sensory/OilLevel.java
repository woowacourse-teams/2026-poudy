package com.poudy.product.domain.sensory;

public final class OilLevel {

    private static final int MINIMUM = 0;
    private static final int MAXIMUM = 3;

    private final int value;

    public OilLevel(int value) {
        if (value < MINIMUM || value > MAXIMUM) {
            throw new IllegalArgumentException("유분감 단계는 0부터 3까지여야 합니다.");
        }
        this.value = value;
    }

    public int value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof OilLevel that && value == that.value;
    }

    @Override
    public int hashCode() {
        return Integer.hashCode(value);
    }
}
