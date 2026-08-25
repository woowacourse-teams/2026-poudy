package com.poudy.search.domain;

import java.text.Normalizer;
import java.util.Locale;

public record SearchKeyword(String value) {

    public SearchKeyword {
        value = normalize(value);
    }

    public boolean matches(String candidate) {
        return match(candidate).isFound();
    }

    public boolean matchesExactly(String... candidates) {
        for (String candidate : candidates) {
            if (match(candidate) == NameMatch.EXACT) {
                return true;
            }
        }
        return false;
    }

    public NameMatch match(String candidate) {
        if (candidate == null) {
            return NameMatch.NONE;
        }

        return match(SearchableText.of(candidate));
    }

    public NameMatch match(SearchableText candidate) {
        if (value.isEmpty()) {
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

    static String normalize(String text) {
        String composed = Normalizer.normalize(text, Normalizer.Form.NFC);

        return withoutSpaces(Chosung.toCompatibilityLetters(composed)).toLowerCase(Locale.ROOT);
    }

    private String compare(SearchableText candidate) {
        if (!Chosung.isWrittenIn(value)) {
            return candidate.normalized();
        }
        if (foldsDoubleLetter()) {
            return candidate.foldedChosung();
        }

        return candidate.chosung();
    }

    private boolean foldsDoubleLetter() {
        return value.length() == 1 && !Chosung.isDouble(value);
    }

    public static String withoutSpaces(String text) {
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
