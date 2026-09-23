package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

public final class SearchKeywordSnapshot {
    private final AtomicReference<State> current;

    public SearchKeywordSnapshot() {
        this(SearchKeywordDictionary.of(List.of()));
    }

    public SearchKeywordSnapshot(SearchKeywordDictionary dictionary) {
        current = new AtomicReference<>(new State(dictionary, List.of(), null));
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
        current.set(new State(dictionary, List.copyOf(rankings), refreshedAt));
    }

    public void initialize(SearchKeywordDictionary dictionary) {
        current.set(new State(dictionary, List.of(), null));
    }

    private record State(SearchKeywordDictionary dictionary, List<RankedKeyword> rankings, Instant refreshedAt) {
    }
}
