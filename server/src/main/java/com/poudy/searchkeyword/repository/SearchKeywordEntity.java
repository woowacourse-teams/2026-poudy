package com.poudy.searchkeyword.repository;

import com.poudy.searchkeyword.domain.DictionaryEntry;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "search_keyword")
public class SearchKeywordEntity {

    @Id
    private String id;

    @Column(name = "keyword")
    private String keyword;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private DictionaryEntry.Status status;

    @Column(name = "ranking_eligible")
    private Boolean rankingEligible;

    protected SearchKeywordEntity() {
    }

    public String id() {
        return id;
    }

    public DictionaryEntry toDomain(List<String> expressions) {
        return DictionaryEntry.of(id, keyword, status, rankingEligible, expressions);
    }
}
