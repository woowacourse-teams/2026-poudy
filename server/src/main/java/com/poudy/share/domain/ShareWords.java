package com.poudy.share.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

final class ShareWords {

    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final String SPACE = " ";

    private ShareWords() {
    }

    static List<String> of(String phrase) {
        String trimmed = Objects.requireNonNullElse(phrase, "").trim();

        if (trimmed.isEmpty()) {
            return List.of();
        }

        return Arrays.asList(SPACES.split(trimmed));
    }

    static String join(List<String> words) {
        return String.join(SPACE, words);
    }

    static int letterCount(String phrase) {
        return phrase.replace(SPACE, "").length();
    }
}
