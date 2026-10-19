package com.poudy.product.search.domain.query;

import java.util.List;
import java.util.Map;

public final class SearchToken {
    private final String normalized;
    private final String jamo;
    private final String reading;

    public SearchToken(String normalized, String jamo, String reading) {
        this.normalized = normalized;
        this.jamo = jamo;
        this.reading = reading;
    }

    public String normalized() {
        return normalized;
    }

    public boolean isEmpty() {
        return normalized.isEmpty();
    }

    public boolean isInitials() {
        return normalized.matches("[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+");
    }

    public String initialPattern() {
        return Map.of("ㄱ", "[ㄱㄲ]", "ㄷ", "[ㄷㄸ]", "ㅂ", "[ㅂㅃ]", "ㅅ", "[ㅅㅆ]", "ㅈ", "[ㅈㅉ]")
            .getOrDefault(normalized, normalized);
    }

    public List<String> expressions() {
        if (jamo.equals(reading)) {
            return List.of(jamo);
        }
        return List.of(jamo, reading);
    }
}
