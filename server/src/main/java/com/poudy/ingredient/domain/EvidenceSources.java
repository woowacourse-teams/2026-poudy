package com.poudy.ingredient.domain;

import java.util.ArrayList;
import java.util.List;

final class EvidenceSources {

    private EvidenceSources() {
    }

    static List<String> parseDescription(String source) {
        return parse(source, false);
    }

    static List<String> parseTag(String source) {
        return parse(source, true);
    }

    private static List<String> parse(String source, boolean splitLines) {
        if (source == null || source.isBlank()) {
            return List.of();
        }

        List<String> evidences = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int parenthesisDepth = 0;

        for (int index = 0; index < source.length(); index++) {
            char character = source.charAt(index);
            if (character == '(') {
                parenthesisDepth++;
            } else if (character == ')' && parenthesisDepth > 0) {
                parenthesisDepth--;
            }

            if (isDelimiter(character, splitLines) && parenthesisDepth == 0) {
                add(evidences, current);
                current.setLength(0);
                continue;
            }
            current.append(character);
        }
        add(evidences, current);

        return List.copyOf(evidences);
    }

    private static boolean isDelimiter(char character, boolean splitLines) {
        return character == ';' || splitLines && (character == '\n' || character == '\r');
    }

    private static void add(List<String> evidences, StringBuilder candidate) {
        String evidence = candidate.toString().trim();
        if (!evidence.isEmpty()) {
            evidences.add(evidence);
        }
    }
}
