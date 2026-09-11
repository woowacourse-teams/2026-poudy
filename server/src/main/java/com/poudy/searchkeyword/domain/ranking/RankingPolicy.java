package com.poudy.searchkeyword.domain.ranking;

import com.poudy.searchkeyword.domain.DictionaryEntry;
import java.util.Set;

public record RankingPolicy(long minCount, int size, Set<String> blockedIds) {
    public RankingPolicy {
        if (minCount < 1 || size < 1) {
            throw new IllegalArgumentException("Ranking limits must be positive");
        }
        blockedIds = Set.copyOf(blockedIds);
    }

    public boolean qualifies(long count) {
        return count >= minCount;
    }

    public boolean publishes(DictionaryEntry entry) {
        return !blockedIds.contains(entry.id());
    }
}
