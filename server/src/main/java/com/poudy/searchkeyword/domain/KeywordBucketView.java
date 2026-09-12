package com.poudy.searchkeyword.domain;

import com.poudy.searchkeyword.domain.ranking.KeywordRanking;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class KeywordBucketView {

    private final Map<String, Long> counts;
    private final Instant windowStart;
    private final Instant observedThrough;
    private final Instant startedAt;
    private final boolean clockRegressed;

    public KeywordBucketView(
        Map<String, Long> counts,
        Instant windowStart,
        Instant observedThrough,
        Instant startedAt,
        boolean clockRegressed
    ) {
        this.counts = Map.copyOf(counts);
        this.windowStart = windowStart;
        this.observedThrough = observedThrough;
        this.startedAt = startedAt;
        this.clockRegressed = clockRegressed;
    }

    public Map<String, Long> counts() {
        return counts;
    }

    public List<RankedKeyword> rank(
        SearchKeywordDictionary dictionary,
        RankingPolicy policy,
        RankingFallback fallback
    ) {
        return KeywordRanking.of(counts, dictionary, policy, fallback);
    }

    public List<RankedKeyword> shadowRank(RankingPolicy policy) {
        return KeywordRanking.shadowOf(counts, policy);
    }

    public KeywordCoverage coverage(SearchKeywordDictionary dictionary) {
        return KeywordCoverage.of(counts, dictionary);
    }

    public Instant windowStart() {
        return windowStart;
    }

    public Instant observedThrough() {
        return observedThrough;
    }

    public Instant startedAt() {
        return startedAt;
    }

    public boolean clockRegressed() {
        return clockRegressed;
    }
}
