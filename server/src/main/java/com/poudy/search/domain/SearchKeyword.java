package com.poudy.search.domain;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.Locale;

public final class SearchKeyword {

    private final String value;
    private final String reading;

    public SearchKeyword(String keyword) {
        this.value = normalize(keyword);
        this.reading = LatinReading.ofKeyword(this.value);
    }

    public String value() {
        return value;
    }

    public boolean matches(String candidate) {
        return match(candidate).isFound();
    }

    public boolean isEmpty() {
        return value.isEmpty();
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

        return SearchableText.formsOf(candidate).stream()
                .map(this::match)
                .min(Comparator.naturalOrder())
                .orElse(NameMatch.NONE);
    }

    public NameMatch match(SearchableText candidate) {
        return rank(candidate).match();
    }

    public NameRank rank(SearchableText candidate) {
        NameMatch direct = match(value, candidate);

        if (direct == NameMatch.EXACT || reading.equals(value)) {
            return NameRank.of(direct, candidate);
        }

        NameMatch byReading = match(reading, candidate);

        if (direct.compareTo(byReading) <= 0) {
            return NameRank.of(direct, candidate);
        }

        return NameRank.ofReading(byReading, candidate);
    }

    static String normalize(String text) {
        String composed = Normalizer.normalize(text, Normalizer.Form.NFC);

        return withoutSpaces(Chosung.toCompatibilityLetters(composed)).toLowerCase(Locale.ROOT);
    }

    private static NameMatch match(String searched, SearchableText candidate) {
        if (searched.isEmpty()) {
            return NameMatch.NONE;
        }

        String compared = compare(searched, candidate);

        if (compared.equals(searched)) {
            return NameMatch.EXACT;
        }
        if (compared.startsWith(searched)) {
            return NameMatch.PREFIX;
        }
        if (compared.contains(searched)) {
            return NameMatch.PARTIAL;
        }

        return NameMatch.NONE;
    }

    private static String compare(String searched, SearchableText candidate) {
        if (!Chosung.isWrittenIn(searched)) {
            return candidate.normalized();
        }
        if (foldsDoubleLetter(searched)) {
            return candidate.foldedChosung();
        }

        return candidate.chosung();
    }

    private static boolean foldsDoubleLetter(String searched) {
        return searched.length() == 1 && !Chosung.isDouble(searched);
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
