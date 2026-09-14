package com.poudy.searchkeyword.service;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.ImprovementReport;
import com.poudy.searchkeyword.domain.KeywordBucketView;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.KeywordCoverage;
import com.poudy.searchkeyword.domain.KeywordSearch;
import com.poudy.searchkeyword.domain.ReportSection;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
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
    private final long reportMinCount;
    private final RankingPolicy rankingPolicy;
    private final RankingFallback rankingFallback;
    private final AtomicReference<List<RankedKeyword>> cachedRankings = new AtomicReference<>(List.of());

    public SearchKeywordService(
        SearchKeywordDictionary dictionary,
        KeywordBuckets successful,
        KeywordSearch search,
        RankingPolicy rankingPolicy,
        long reportMinCount,
        RankingFallback rankingFallback
    ) {
        if (reportMinCount < 1) {
            throw new IllegalArgumentException("Report minimum count must be positive");
        }
        this.dictionary = dictionary;
        this.successful = successful;
        this.search = search;
        this.reportMinCount = reportMinCount;
        this.rankingPolicy = rankingPolicy;
        this.rankingFallback = rankingFallback;
    }

    public void record(SearchKeyword keyword) {
        if (!search.hasResults(keyword.text())) {
            return;
        }
        successful.record(keyword.text());
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

    public ImprovementReport report(String catalogVersion, String searchVersion) {
        KeywordBucketView view = successful.view();
        return new ImprovementReport(
            dictionary.version(),
            catalogVersion,
            searchVersion,
            view.coverage(dictionary),
            ReportSection.unresolvedOf(view, dictionary, reportMinCount),
            view.shadowRank(rankingPolicy)
        );
    }
}
