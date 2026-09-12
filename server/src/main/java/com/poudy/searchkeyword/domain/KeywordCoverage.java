package com.poudy.searchkeyword.domain;

import java.util.Map;

public record KeywordCoverage(long total, long resolved, int distinctKeys) {

    public static KeywordCoverage of(Map<String, Long> counts, SearchKeywordDictionary dictionary) {
        long total = counts.values().stream().mapToLong(Long::longValue).reduce(0L, Math::addExact);
        long resolved = counts.entrySet().stream()
            .filter(entry -> dictionary.recognizes(entry.getKey()))
            .mapToLong(Map.Entry::getValue)
            .reduce(0L, Math::addExact);
        return new KeywordCoverage(total, resolved, counts.size());
    }

    public double ratio() {
        if (total == 0) {
            return 0;
        }
        return (double) resolved / total;
    }
}
