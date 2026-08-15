package com.poudy.common.domain;

import java.util.Locale;

public record SearchKeyword(String value) {

    public SearchKeyword {
        value = value.strip().toLowerCase(Locale.ROOT);
    }

    public boolean matches(String candidate) {
        if (candidate == null) {
            return false;
        }
        if (Chosung.isWrittenIn(value)) {
            return matchesChosung(candidate);
        }

        return candidate.toLowerCase(Locale.ROOT).contains(value);
    }

    private boolean matchesChosung(String candidate) {
        Chosung chosung = Chosung.of(candidate);

        if (foldsDoubleLetter()) {
            return chosung.folded().contains(value);
        }

        return chosung.contains(value);
    }

    private boolean foldsDoubleLetter() {
        return value.length() == 1 && !Chosung.isDouble(value);
    }
}
