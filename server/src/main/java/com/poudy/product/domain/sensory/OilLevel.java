package com.poudy.product.domain.sensory;

public record OilLevel(int value) {

    private static final int MINIMUM = 0;
    private static final int MAXIMUM = 3;

    public OilLevel {
        if (value < MINIMUM || value > MAXIMUM) {
            throw new IllegalArgumentException("유분감 단계는 0부터 3까지여야 합니다.");
        }
    }
}
