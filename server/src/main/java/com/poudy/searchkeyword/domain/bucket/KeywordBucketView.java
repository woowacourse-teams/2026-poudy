package com.poudy.searchkeyword.domain.bucket;

import com.poudy.searchkeyword.domain.dictionary.KeywordCoverage;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.KeywordRanking;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import java.util.List;
import java.util.Map;

public final class KeywordBucketView {

    private final Map<String, Long> counts;

    public KeywordBucketView(Map<String, Long> counts) {
        this.counts = Map.copyOf(counts);
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

    public List<RankedKeyword> rank(
        SearchKeywordDictionary dictionary,
        RankingPolicy policy,
        RankingFallback fallback,
        KeywordBucketView compared
    ) {
        return KeywordRanking.of(counts, compared.counts(), dictionary, policy, fallback);
    }

    public KeywordCoverage coverage(SearchKeywordDictionary dictionary) {
        return KeywordCoverage.of(counts, dictionary);
    }
}
