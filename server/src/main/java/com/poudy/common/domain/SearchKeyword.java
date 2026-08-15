package com.poudy.common.domain;

import java.text.Normalizer;
import java.util.Locale;

public record SearchKeyword(String value) {

    public SearchKeyword {
        value = normalize(value);
    }

    private static String normalize(String value) {
        String composed = Normalizer.normalize(value, Normalizer.Form.NFC);

        return withoutSpaces(Chosung.toCompatibilityLetters(composed)).toLowerCase(Locale.ROOT);
    }

    private static String withoutSpaces(String text) {
        StringBuilder compact = new StringBuilder(text.length());

        for (int index = 0; index < text.length(); index++) {
            char character = text.charAt(index);
            if (!isSpace(character)) {
                compact.append(character);
            }
        }

        return compact.toString();
    }

    private static boolean isSpace(char character) {
        return Character.isWhitespace(character) || Character.isSpaceChar(character);
    }

    public boolean matches(String candidate) {
        if (candidate == null) {
            return false;
        }
        if (Chosung.isWrittenIn(value)) {
            return matchesChosung(candidate);
        }

        return withoutSpaces(candidate.toLowerCase(Locale.ROOT)).contains(value);
    }

    private boolean matchesChosung(String candidate) {
        Chosung chosung = Chosung.of(withoutSpaces(candidate));

        if (foldsDoubleLetter()) {
            return chosung.folded().contains(value);
        }

        return chosung.contains(value);
    }

    private boolean foldsDoubleLetter() {
        return value.length() == 1 && !Chosung.isDouble(value);
    }
}
