package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public final class SearchKeywordDictionary {

    private final String version;
    private final Map<String, DictionaryEntry> expressions;
    private final int activeEntryCount;
    private final List<String> emptyActiveEntryIds;
    private final KeywordSearch search;
    private final Map<String, Boolean> catalogEligibility = new ConcurrentHashMap<>();

    private SearchKeywordDictionary(
        String version,
        Map<String, DictionaryEntry> expressions,
        int activeEntryCount,
        List<String> emptyActiveEntryIds,
        KeywordSearch search
    ) {
        this.version = version;
        this.expressions = expressions;
        this.activeEntryCount = activeEntryCount;
        this.emptyActiveEntryIds = emptyActiveEntryIds;
        this.search = search;
    }

    public static SearchKeywordDictionary of(String version, List<DictionaryEntry> entries, KeywordSearch search) {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException("사전 버전은 비어 있을 수 없습니다.");
        }
        List<DictionaryEntry> copied = List.copyOf(entries);
        requireUniqueIds(copied);
        List<DictionaryEntry> activeEntries = copied.stream().filter(DictionaryEntry::isActive).toList();
        List<String> emptyActiveEntryIds = activeEntries.stream()
            .filter(entry -> !entry.hasExpressions())
            .map(DictionaryEntry::id)
            .toList();
        return new SearchKeywordDictionary(
            version,
            indexExpressions(activeEntries),
            activeEntries.size(),
            emptyActiveEntryIds,
            search
        );
    }

    public Optional<DictionaryEntry> resolve(String normalizedQuery) {
        return Optional.ofNullable(expressions.get(matchKey(normalizedQuery)));
    }

    public boolean canRank(DictionaryEntry entry) {
        if (!entry.isRankable()) {
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

    public int emptyActiveEntryCount() {
        return emptyActiveEntryIds.size();
    }

    private static String matchKey(String normalizedQuery) {
        return SearchKeyword.folded(normalizedQuery);
    }

    private static void requireUniqueIds(List<DictionaryEntry> entries) {
        Set<String> ids = new HashSet<>();
        entries.forEach(entry -> {
            if (!ids.add(entry.id())) {
                throw new IllegalArgumentException("사전 ID가 중복됐습니다: " + entry.id());
            }
        });
    }

    private static Map<String, DictionaryEntry> indexExpressions(List<DictionaryEntry> activeEntries) {
        Map<String, DictionaryEntry> index = new HashMap<>();
        activeEntries.forEach(entry -> entry.expressions().forEach(expression -> claim(index, expression, entry)));
        return Collections.unmodifiableMap(index);
    }

    private static void claim(Map<String, DictionaryEntry> index, String expression, DictionaryEntry entry) {
        if (index.putIfAbsent(expression, entry) != null) {
            throw new IllegalArgumentException("ACTIVE 사전 표현이 충돌했습니다: " + entry.id());
        }
    }
}
