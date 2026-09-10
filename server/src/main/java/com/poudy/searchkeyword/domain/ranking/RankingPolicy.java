package com.poudy.searchkeyword.domain.ranking;

import java.util.Set;

public record RankingPolicy(long minCount, int size, Set<String> blockedIds) {
    public RankingPolicy {
        if (minCount < 1 || size < 1) {
            throw new IllegalArgumentException("Ranking limits must be positive");
        }
        blockedIds = Set.copyOf(blockedIds);
    }

    public boolean publishes(String entryId) {
        return !blockedIds.contains(entryId);
    }
}
