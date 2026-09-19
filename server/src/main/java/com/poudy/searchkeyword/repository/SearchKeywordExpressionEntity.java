package com.poudy.searchkeyword.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "search_keyword_expression")
public class SearchKeywordExpressionEntity {

    @Id
    @Column(name = "expression_key")
    private String expressionKey;

    @Column(name = "keyword_id")
    private String keywordId;

    protected SearchKeywordExpressionEntity() {
    }

    public String expressionKey() {
        return expressionKey;
    }

    public String keywordId() {
        return keywordId;
    }
}
