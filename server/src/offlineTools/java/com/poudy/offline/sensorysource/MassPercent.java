package com.poudy.offline.sensorysource;

import java.math.BigDecimal;

public record MassPercent(BigDecimal value) {

    private static final BigDecimal MINIMUM = BigDecimal.ZERO;
    private static final BigDecimal MAXIMUM = new BigDecimal("100");

    public MassPercent {
        value = requireInRange(value, MINIMUM, MAXIMUM, "처방 질량 백분율");
    }

    public static MassPercent parse(String value) {
        return new MassPercent(parseDecimal(value, "처방 질량 백분율"));
    }

    private static BigDecimal requireInRange(
            BigDecimal value,
            BigDecimal minimum,
            BigDecimal maximum,
            String name) {
        if (value == null) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
        if (value.compareTo(minimum) < 0 || value.compareTo(maximum) > 0) {
            throw new IllegalArgumentException(name + "은 0 이상 100 이하여야 합니다.");
        }

        return canonical(value);
    }

    private static BigDecimal parseDecimal(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "의 십진수 문자열이 필요합니다.");
        }

        try {
            return new BigDecimal(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(name + "은 유효한 십진수여야 합니다.", exception);
        }
    }

    private static BigDecimal canonical(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
