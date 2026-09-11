package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public final class DictionaryEntry implements Comparable<DictionaryEntry> {

    public enum Kind {
        BRAND,
        PRODUCT,
        TERM
    }

    public enum Status {
        ACTIVE,
        INACTIVE
    }

    public enum ExpressionType {
        CATALOG,
        REVIEWED_ALIAS
    }

    private final String id;
    private final Kind kind;
    private final String keyword;
    private final String normalizedKeyword;
    private final Status status;
    private final boolean rankingEligible;
    private final Set<String> expressions;

    public DictionaryEntry(
        String id,
        Kind kind,
        String keyword,
        Status status,
        boolean rankingEligible,
        List<String> expressions,
        Map<String, ExpressionType> expressionTypes
    ) {
        this.id = requiredText(id);
        this.kind = kind;
        this.keyword = requiredText(keyword);
        this.normalizedKeyword = requiredText(new SearchKeyword(keyword).value());
        this.status = status;
        this.rankingEligible = rankingEligible;
        this.expressions = normalizedExpressions(id, expressions, expressionTypes);
    }

    private static Set<String> normalizedExpressions(
        String id,
        List<String> expressions,
        Map<String, ExpressionType> expressionTypes
    ) {
        Set<String> normalized = expressions.stream()
            .map(DictionaryEntry::normalizedText)
            .collect(Collectors.toUnmodifiableSet());
        expressionTypes.forEach((key, type) -> requireNormalizedSource(id, key, type));
        if (!normalized.equals(expressionTypes.keySet())) {
            throw new IllegalArgumentException("사전 표현과 표현 출처의 정규화 키가 다릅니다: " + id);
        }
        return normalized;
    }

    private static String normalizedText(String expression) {
        return requiredText(new SearchKeyword(requiredText(expression)).value());
    }

    private static void requireNormalizedSource(String id, String key, ExpressionType type) {
        requiredText(key);
        if (type == null) {
            throw new IllegalArgumentException("사전 표현 출처가 비어 있습니다: " + id);
        }
        if (!key.equals(new SearchKeyword(key).value())) {
            throw new IllegalArgumentException("사전 표현 출처의 키가 정규화되어 있지 않습니다: " + id);
        }
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

    public Kind kind() {
        return kind;
    }

    public String keyword() {
        return keyword;
    }

    public Status status() {
        return status;
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
