package com.poudy.offline.source;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

public record ContentSha256(String value) {

    private static final int HEX_LENGTH = 64;

    public ContentSha256 {
        if (value == null || value.length() != HEX_LENGTH || !value.matches("[0-9a-fA-F]{64}")) {
            throw new IllegalArgumentException("원문 SHA-256은 64자리 16진수여야 합니다.");
        }

        value = value.toLowerCase(Locale.ROOT);
    }

    public static ContentSha256 digest(byte[] content) {
        if (content == null) {
            throw new IllegalArgumentException("SHA-256을 계산할 원문 byte가 필요합니다.");
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return new ContentSha256(HexFormat.of().formatHex(digest.digest(content)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM에서 SHA-256을 사용할 수 없습니다.", exception);
        }
    }
}
