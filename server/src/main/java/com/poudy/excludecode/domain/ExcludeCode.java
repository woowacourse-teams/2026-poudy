package com.poudy.excludecode.domain;

import java.util.Objects;

public final class ExcludeCode {

    private final String code;

    public ExcludeCode(String code) {
        this.code = Objects.requireNonNull(code, "제외 성분군 코드가 필요합니다.");
    }

    public String value() {
        return code;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof ExcludeCode that && code.equals(that.code);
    }

    @Override
    public int hashCode() {
        return code.hashCode();
    }
}
