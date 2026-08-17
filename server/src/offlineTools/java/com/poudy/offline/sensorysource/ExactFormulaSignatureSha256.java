package com.poudy.offline.sensorysource;

import java.util.Locale;

public record ExactFormulaSignatureSha256(String value) {

    private static final int HEX_LENGTH = 64;

    public ExactFormulaSignatureSha256 {
        if (value == null || value.length() != HEX_LENGTH || !value.matches("[0-9a-fA-F]{64}")) {
            throw new IllegalArgumentException("exact formula signature SHA-256은 64자리 16진수여야 합니다.");
        }
        value = value.toLowerCase(Locale.ROOT);
    }
}
