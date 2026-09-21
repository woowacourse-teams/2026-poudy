package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

public final class SearchKeywordCache {
    private final AtomicReference<Snapshot> current;

    public SearchKeywordCache(SearchKeywordDictionary dictionary) {
        current = new AtomicReference<>(new Snapshot(dictionary, List.of(), null));
    }

    public boolean recognizes(String keyword) {
        return current.get().dictionary().recognizes(keyword);
    }

    public List<RankedKeyword> rankings() {
        return current.get().rankings();
    }

    public Optional<Instant> refreshedAt() {
        return Optional.ofNullable(current.get().refreshedAt());
    }

    public void replace(SearchKeywordDictionary dictionary, List<RankedKeyword> rankings, Instant refreshedAt) {
        current.set(new Snapshot(dictionary, List.copyOf(rankings), refreshedAt));
    }

    private record Snapshot(SearchKeywordDictionary dictionary, List<RankedKeyword> rankings, Instant refreshedAt) {
    }
}
