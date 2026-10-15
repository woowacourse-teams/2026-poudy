package com.poudy.product.domain;

import java.util.regex.Pattern;

public final class Badge {

    private static final Pattern WHITESPACE = Pattern.compile("\\s");

    private final String code;
    private final String name;

    public Badge(String code, String name) {
        requireText(code, 50, "배지 코드");
        requireText(name, 100, "배지 이름");
        this.code = code;
        this.name = name;
    }

    private static void requireText(String value, int maxLength, String field) {
        if (value == null || value.isEmpty() || WHITESPACE.matcher(value).find()) {
            throw new IllegalArgumentException(field + "는 공백 없이 입력해야 합니다.");
        }
        if (value.codePointCount(0, value.length()) > maxLength) {
            throw new IllegalArgumentException(field + "는 " + maxLength + "자 이하여야 합니다.");
        }
    }

    public String code() {
        return code;
    }

    public String name() {
        return name;
    }
}
