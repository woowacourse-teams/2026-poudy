package com.poudy.searchkeyword.domain;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public final class SearchKeywordDictionary {

    private final String version;
    private final Map<String, DictionaryEntry> expressions;
    private final int activeEntryCount;
    private final List<String> emptyActiveEntryIds;
    private final Map<String, DictionaryEntry> entriesById;
    private final Map<String, Boolean> catalogEligibility = new ConcurrentHashMap<>();
    private final KeywordSearch search;

    public SearchKeywordDictionary(String version, List<DictionaryEntry> entries, KeywordSearch search) {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException("사전 버전은 비어 있을 수 없습니다.");
        }
        this.version = version;
        Set<String> ids = new HashSet<>();
        Map<String, DictionaryEntry> index = new HashMap<>();
        this.search = Objects.requireNonNull(search);
        Map<String, DictionaryEntry> byId = new HashMap<>();
        for (DictionaryEntry entry : List.copyOf(entries)) {
            if (!ids.add(entry.id())) {
                throw new IllegalArgumentException("사전 ID가 중복됐습니다: " + entry.id());
            }
            if (entry.isActive()) {
                for (String expression : entry.expressions()) {
                    if (index.putIfAbsent(expression, entry) != null) {
                        throw new IllegalArgumentException("ACTIVE 사전 표현이 충돌했습니다: " + entry.id());
                    }
                }
            }
        }
        for (DictionaryEntry entry : entries) {
            byId.put(entry.id(), entry);
        }
        // Map.copyOf uses linear probing, which degrades for many similar expression hashes.
        // The private HashMap remains read-only after construction and handles collisions predictably.
        this.expressions = Collections.unmodifiableMap(index);
        this.entriesById = Collections.unmodifiableMap(byId);
        this.activeEntryCount = (int) entries.stream().filter(DictionaryEntry::isActive).count();
        this.emptyActiveEntryIds = entries.stream()
            .filter(DictionaryEntry::isActive)
            .filter(entry -> entry.expressions().isEmpty())
            .map(DictionaryEntry::id)
            .toList();
    }

    public Optional<DictionaryEntry> resolve(String normalizedQuery) {
        return Optional.ofNullable(expressions.get(normalizedQuery));
    }

    public boolean validateForRanking(DictionaryEntry entry) {
        if (entry == null || entriesById.get(entry.id()) != entry || !entry.isActive() || !entry.rankingEligible()) {
            return false;
        }
        return catalogEligibility.computeIfAbsent(entry.id(), ignored -> search.hasResults(entry.keyword()));
    }

    public String version() {
        return version;
    }

    public int activeEntryCount() {
        return activeEntryCount;
    }

    public int expressionCount() {
        return expressions.size();
    }

    public List<String> emptyActiveEntryIds() {
        return emptyActiveEntryIds;
    }
}
