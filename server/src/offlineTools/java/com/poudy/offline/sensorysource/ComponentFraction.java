package com.poudy.offline.sensorysource;

import java.math.BigDecimal;

public record ComponentFraction(BigDecimal value) {

    public ComponentFraction {
        if (value == null) {
            throw new IllegalArgumentException("복합원료 내부 구성비가 필요합니다.");
        }
        if (value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("복합원료 내부 구성비는 0 이상 1 이하여야 합니다.");
        }

        BigDecimal stripped = value.stripTrailingZeros();
        value = stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }

    public static ComponentFraction parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("복합원료 내부 구성비의 십진수 문자열이 필요합니다.");
        }

        try {
            return new ComponentFraction(new BigDecimal(value));
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("복합원료 내부 구성비는 유효한 십진수여야 합니다.", exception);
        }
    }
}
