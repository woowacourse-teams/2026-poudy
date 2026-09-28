package com.poudy.searchkeyword.domain.bucket;

import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.KeywordCoverage;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.KeywordRanking;
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

    public List<DictionaryEntry> candidates(SearchKeywordDictionary dictionary, RankingPolicy policy) {
        return KeywordRanking.candidates(counts, dictionary, policy);
    }

    public KeywordCoverage coverage(SearchKeywordDictionary dictionary) {
        return KeywordCoverage.of(counts, dictionary);
    }
}
