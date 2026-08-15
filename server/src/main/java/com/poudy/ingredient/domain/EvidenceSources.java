package com.poudy.ingredient.domain;

import java.util.ArrayList;
import java.util.List;

final class EvidenceSources {

    private EvidenceSources() {
    }

    static List<String> parseDescription(String source) {
        return parse(source, EvidenceDelimiter.SEMICOLON);
    }

    static List<String> parseTag(String source) {
        return parse(source, EvidenceDelimiter.SEMICOLON_OR_LINE_BREAK);
    }

    private static List<String> parse(String source, EvidenceDelimiter delimiter) {
        if (source == null || source.isBlank()) {
            return List.of();
        }

        List<String> evidences = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        ParenthesisDepth depth = new ParenthesisDepth();

        for (int index = 0; index < source.length(); index++) {
            char character = source.charAt(index);
            depth.accept(character);

            if (delimiter.isBoundary(character) && depth.isOutside()) {
                add(evidences, current);
                current.setLength(0);
                continue;
            }
            current.append(character);
        }
        add(evidences, current);

        return List.copyOf(evidences);
    }

    private static void add(List<String> evidences, StringBuilder candidate) {
        String evidence = candidate.toString().trim();
        if (!evidence.isEmpty()) {
            evidences.add(evidence);
        }
    }
}
