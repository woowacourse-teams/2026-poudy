package com.poudy.searchkeyword.domain.ranking;

import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import java.util.Set;

public final class RankingPolicy {

    private final long minCount;
    private final int size;
    private final Set<String> blockedIds;

    public RankingPolicy(long minCount, int size, Set<String> blockedIds) {
        if (minCount < 1 || size < 1) {
            throw new IllegalArgumentException("Ranking limits must be positive");
        }
        this.minCount = minCount;
        this.size = size;
        this.blockedIds = Set.copyOf(blockedIds);
    }

    public boolean qualifies(long count) {
        return count >= minCount;
    }

    public boolean publishes(DictionaryEntry entry) {
        return !blockedIds.contains(entry.id());
    }

    public int size() {
        return size;
    }
}
