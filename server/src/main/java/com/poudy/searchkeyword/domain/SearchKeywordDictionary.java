package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
        List<DictionaryEntry> copied = List.copyOf(entries);
        this.version = version;
        this.search = search;
        this.entriesById = indexById(copied);
        this.expressions = indexActiveExpressions(copied);
        this.activeEntryCount = (int) copied.stream().filter(DictionaryEntry::isActive).count();
        this.emptyActiveEntryIds = copied.stream()
            .filter(DictionaryEntry::isActive)
            .filter(entry -> !entry.hasExpressions())
            .map(DictionaryEntry::id)
            .toList();
    }

    public Optional<DictionaryEntry> resolve(String normalizedQuery) {
        return Optional.ofNullable(expressions.get(matchKey(normalizedQuery)));
    }

    public boolean validateForRanking(DictionaryEntry entry) {
        if (entry == null || !owns(entry) || !entry.isRankable()) {
            return false;
        }
        return catalogEligibility.computeIfAbsent(entry.id(), ignored -> search.hasResults(entry.keyword()));
    }

    public boolean recognizes(String normalizedQuery) {
        return expressions.containsKey(matchKey(normalizedQuery));
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

    private static String matchKey(String normalizedQuery) {
        return SearchKeyword.folded(normalizedQuery);
    }

    private boolean owns(DictionaryEntry entry) {
        return entriesById.get(entry.id()) == entry;
    }

    private static Map<String, DictionaryEntry> indexById(List<DictionaryEntry> entries) {
        Map<String, DictionaryEntry> byId = new HashMap<>();
        for (DictionaryEntry entry : entries) {
            if (byId.putIfAbsent(entry.id(), entry) != null) {
                throw new IllegalArgumentException("사전 ID가 중복됐습니다: " + entry.id());
            }
        }
        return Collections.unmodifiableMap(byId);
    }

    private static Map<String, DictionaryEntry> indexActiveExpressions(List<DictionaryEntry> entries) {
        Map<String, DictionaryEntry> index = new HashMap<>();
        entries.stream()
            .filter(DictionaryEntry::isActive)
            .forEach(entry -> addExpressions(index, entry));
        return Collections.unmodifiableMap(index);
    }

    private static void addExpressions(Map<String, DictionaryEntry> index, DictionaryEntry entry) {
        for (String expression : entry.expressions()) {
            if (index.putIfAbsent(expression, entry) != null) {
                throw new IllegalArgumentException("ACTIVE 사전 표현이 충돌했습니다: " + entry.id());
            }
        }
    }
}
