package com.poudy.searchkeyword.domain.dictionary;

import com.poudy.search.domain.SearchKeyword;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class DictionaryEntry implements Comparable<DictionaryEntry> {

    public enum Status {
        ACTIVE,
        INACTIVE
    }

    private final String id;
    private final String keyword;
    private final String normalizedKeyword;
    private final Status status;
    private final boolean rankingEligible;
    private final Set<String> expressions;

    private DictionaryEntry(
        String id,
        String keyword,
        String normalizedKeyword,
        Status status,
        boolean rankingEligible,
        Set<String> expressions
    ) {
        this.id = id;
        this.keyword = keyword;
        this.normalizedKeyword = normalizedKeyword;
        this.status = status;
        this.rankingEligible = rankingEligible;
        this.expressions = expressions;
    }

    public static DictionaryEntry of(
        String id,
        String keyword,
        Status status,
        boolean rankingEligible,
        List<String> expressions
    ) {
        requiredText(id);
        String normalizedKeyword = normalizedText(keyword);
        Set<String> normalizedExpressions = expressions.stream()
            .map(DictionaryEntry::normalizedText)
            .collect(Collectors.toUnmodifiableSet());
        return new DictionaryEntry(id, keyword, normalizedKeyword, status, rankingEligible, normalizedExpressions);
    }

    private static String normalizedText(String text) {
        return requiredText(new SearchKeyword(requiredText(text)).value());
    }

    private static String requiredText(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("사전 문자열은 비어 있을 수 없습니다.");
        }
        return value;
    }

    public String id() {
        return id;
    }

    public String keyword() {
        return keyword;
    }

    public Set<String> expressions() {
        return expressions;
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
    }

    public boolean isRankable() {
        return isActive() && rankingEligible;
    }

    public boolean hasExpressions() {
        return !expressions.isEmpty();
    }

    @Override
    public int compareTo(DictionaryEntry other) {
        int byKeyword = normalizedKeyword.compareTo(other.normalizedKeyword);
        if (byKeyword != 0) {
            return byKeyword;
        }
        return id.compareTo(other.id);
    }
}
