package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "search_keyword")
public class DictionaryEntry implements Comparable<DictionaryEntry> {

    public enum Status {
        ACTIVE,
        INACTIVE
    }

    @Id
    private String id;

    @Column(name = "keyword")
    private String keyword;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Status status;

    @Column(name = "ranking_eligible")
    private boolean rankingEligible;

    @ElementCollection
    @CollectionTable(name = "search_keyword_expression", joinColumns = @JoinColumn(name = "keyword_id"))
    @Column(name = "expression_key")
    private Set<String> expressionKeys = new HashSet<>();

    @Transient
    private String normalizedKeyword;

    @Transient
    private Set<String> expressions;

    protected DictionaryEntry() {
    }

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
        this.expressionKeys = new HashSet<>(expressions);
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

    @PostLoad
    private void normalize() {
        this.normalizedKeyword = normalizedText(keyword);
        this.expressions = expressionKeys.stream()
            .map(DictionaryEntry::normalizedText)
            .collect(Collectors.toUnmodifiableSet());
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
