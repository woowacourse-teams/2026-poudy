package com.poudy.common.domain;

import java.text.Normalizer;
import java.util.Locale;

public record SearchKeyword(String value) {

    public SearchKeyword {
        value = normalize(value);
    }

    public boolean matches(String candidate) {
        return match(candidate).isFound();
    }

    public NameMatch match(String candidate) {
        if (candidate == null) {
            return NameMatch.NONE;
        }

        String compared = compare(candidate);

        if (compared.equals(value)) {
            return NameMatch.EXACT;
        }
        if (compared.startsWith(value)) {
            return NameMatch.PREFIX;
        }
        if (compared.contains(value)) {
            return NameMatch.PARTIAL;
        }

        return NameMatch.NONE;
    }

    private String compare(String candidate) {
        if (Chosung.isWrittenIn(value)) {
            return chosungOf(candidate);
        }

        return withoutSpaces(candidate.toLowerCase(Locale.ROOT));
    }

    private String chosungOf(String candidate) {
        Chosung chosung = Chosung.of(withoutSpaces(candidate));

        if (foldsDoubleLetter()) {
            return chosung.folded().value();
        }

        return chosung.value();
    }

    private boolean foldsDoubleLetter() {
        return value.length() == 1 && !Chosung.isDouble(value);
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
}
