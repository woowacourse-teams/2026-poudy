package com.poudy.share.domain;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 정제와 브랜드 분리가 같은 낱말 기준을 쓴다. 브랜드 이름에 공백이 들어갈 수 있다.
 */
final class ShareWords {

    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final String SPACE = " ";

    private ShareWords() {
    }

    static List<String> of(String phrase) {
        String trimmed = phrase == null ? "" : phrase.trim();

        if (trimmed.isEmpty()) {
            return List.of();
        }

        return Arrays.asList(SPACES.split(trimmed));
    }

    static String join(List<String> words) {
        return String.join(SPACE, words);
    }
}
