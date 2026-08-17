package com.poudy.offline.source;

import java.util.Locale;

public record ContentSha256(String value) {

    private static final int HEX_LENGTH = 64;

    public ContentSha256 {
        if (value == null || value.length() != HEX_LENGTH || !value.matches("[0-9a-fA-F]{64}")) {
            throw new IllegalArgumentException("원문 SHA-256은 64자리 16진수여야 합니다.");
        }

        value = value.toLowerCase(Locale.ROOT);
    }
}
