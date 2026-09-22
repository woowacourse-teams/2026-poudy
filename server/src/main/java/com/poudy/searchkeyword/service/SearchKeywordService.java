package com.poudy.searchkeyword.service;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.bucket.KeywordBucketView;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.dictionary.KeywordCoverage;
import com.poudy.searchkeyword.domain.dictionary.KeywordSearch;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SearchKeywordService {

    private static final Logger log = LoggerFactory.getLogger(SearchKeywordService.class);
    private final SearchKeywordDictionary dictionary;
    private final KeywordBuckets successful;
    private final KeywordSearch search;
    private final RankingPolicy rankingPolicy;
    private final RankingFallback rankingFallback;
    private final AtomicReference<List<RankedKeyword>> cachedRankings = new AtomicReference<>(List.of());

    public SearchKeywordService(
        SearchKeywordDictionary dictionary,
        KeywordBuckets successful,
        KeywordSearch search,
        RankingPolicy rankingPolicy,
        RankingFallback rankingFallback
    ) {
        this.dictionary = dictionary;
        this.successful = successful;
        this.search = search;
        this.rankingPolicy = rankingPolicy;
        this.rankingFallback = rankingFallback;
    }

    public void record(SearchKeyword keyword) {
        if (!search.hasResults(keyword.text())) {
            return;
        }
        successful.record(keyword.text());
        logWhenUnresolved(keyword.text());
    }

    private void logWhenUnresolved(String normalizedQuery) {
        if (dictionary.recognizes(normalizedQuery)) {
            return;
        }
        log.info("event=search_keyword_unresolved keyword=\"{}\"", quoted(normalizedQuery));
    }

    private static String quoted(String normalizedQuery) {
        return normalizedQuery.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    public List<RankedKeyword> rankings() {
        return cachedRankings.get();
    }

    public void refreshRankings() {
        try {
            KeywordBucketView view = successful.view();
            cachedRankings.set(ranked(view));
            logCoverage(view.coverage(dictionary));
        } catch (RuntimeException exception) {
            log.warn("event=search_keyword_rankings_refresh_failed");
        }
    }

    private List<RankedKeyword> ranked(KeywordBucketView view) {
        return successful.comparisonView()
            .map(compared -> view.rank(dictionary, rankingPolicy, rankingFallback, compared))
            .orElseGet(() -> view.rank(dictionary, rankingPolicy, rankingFallback));
    }

    private static void logCoverage(KeywordCoverage coverage) {
        log.info(
            "event=search_keyword_coverage total={} resolved={} ratio={} keys={}",
            coverage.total(),
            coverage.resolved(),
            "%.3f".formatted(coverage.ratio()),
            coverage.distinctKeys()
        );
    }

}
