package com.poudy.ingredient.domain;

import java.util.ArrayList;
import java.util.List;

public final class Evidence {

    private static final String DEFERRED_PREFIX = "태그 보류";

    private final String source;
    private final EvidenceDelimiter delimiter;

    private Evidence(String source, EvidenceDelimiter delimiter) {
        this.source = source;
        this.delimiter = delimiter;
    }

    public static Evidence ofDescription(String source) {
        return new Evidence(source, EvidenceDelimiter.SEMICOLON);
    }

    public static Evidence ofTag(String source) {
        return new Evidence(source, EvidenceDelimiter.SEMICOLON_OR_LINE_BREAK);
    }

    public boolean isDeferred() {
        return sources().stream()
            .anyMatch(evidence -> evidence.startsWith(DEFERRED_PREFIX));
    }

    public List<String> sources() {
        if (source == null || source.isBlank()) {
            return List.of();
        }

        List<String> sources = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        ParenthesisDepth depth = new ParenthesisDepth();

        for (int index = 0; index < source.length(); index++) {
            char character = source.charAt(index);
            depth.accept(character);

            if (delimiter.isBoundary(character) && depth.isOutside()) {
                add(sources, current);
                current.setLength(0);
                continue;
            }
            current.append(character);
        }
        add(sources, current);

        return List.copyOf(sources);
    }

    private static void add(List<String> sources, StringBuilder candidate) {
        String source = candidate.toString().trim();
        if (!source.isEmpty()) {
            sources.add(source);
        }
    }
}
