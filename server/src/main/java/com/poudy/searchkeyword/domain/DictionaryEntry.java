package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public final class DictionaryEntry {

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
        this.kind = Objects.requireNonNull(kind);
        this.keyword = requiredText(keyword);
        this.normalizedKeyword = requiredText(new SearchKeyword(keyword).value());
        this.status = Objects.requireNonNull(status);
        this.rankingEligible = rankingEligible;
        Set<String> normalized = new HashSet<>();
        for (String expression : Objects.requireNonNull(expressions)) {
            normalized.add(requiredText(new SearchKeyword(requiredText(expression)).value()));
        }
        Objects.requireNonNull(expressionTypes).forEach((key, type) -> {
            requiredText(key);
            Objects.requireNonNull(type);
            if (!key.equals(new SearchKeyword(key).value())) {
                throw new IllegalArgumentException("사전 표현 출처의 키가 정규화되어 있지 않습니다: " + id);
            }
        });
        if (!normalized.equals(expressionTypes.keySet())) {
            throw new IllegalArgumentException("사전 표현과 표현 출처의 정규화 키가 다릅니다: " + id);
        }
        this.expressions = Set.copyOf(normalized);
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

    public String normalizedKeyword() {
        return normalizedKeyword;
    }

    public Status status() {
        return status;
    }

    public boolean rankingEligible() {
        return rankingEligible;
    }

    public Set<String> expressions() {
        return expressions;
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
    }
}
