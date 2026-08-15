package com.poudy.common.domain;

import java.util.Locale;

public record SearchKeyword(String value) {

    public SearchKeyword {
        value = value.strip().toLowerCase(Locale.ROOT);
    }

    public boolean matches(String candidate) {
        return candidate != null && candidate.toLowerCase(Locale.ROOT).contains(value);
    }
}
