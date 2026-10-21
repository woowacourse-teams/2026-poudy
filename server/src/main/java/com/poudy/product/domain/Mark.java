package com.poudy.product.domain;

import java.util.regex.Pattern;

public final class Mark {

    private static final Pattern WHITESPACE = Pattern.compile("\\s");

    private final String code;
    private final String name;

    public Mark(String code, String name) {
        requireText(code, 50, "표식 코드");
        requireText(name, 100, "표식 이름");
        if (WHITESPACE.matcher(code).find()) {
            throw new IllegalArgumentException("표식 코드는 공백 없이 입력해야 합니다.");
        }
        this.code = code;
        this.name = name;
    }

    private static void requireText(String value, int maxLength, String field) {
        if (value == null || value.isEmpty() || value.matches("\\s*")) {
            throw new IllegalArgumentException(field + "는 비어 있으면 안 됩니다.");
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
