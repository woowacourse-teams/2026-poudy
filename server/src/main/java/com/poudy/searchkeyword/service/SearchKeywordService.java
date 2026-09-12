package com.poudy.searchkeyword.service;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.observation.ProductSearchObserver;
import com.poudy.searchkeyword.domain.ImprovementReport;
import com.poudy.searchkeyword.domain.KeywordBucketView;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.KeywordCoverage;
import com.poudy.searchkeyword.domain.ReportSection;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.domain.ranking.KeywordRanking;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SearchKeywordService implements ProductSearchObserver {

    private static final Logger log = LoggerFactory.getLogger(SearchKeywordService.class);
    private final SearchKeywordDictionary dictionary;
    private final KeywordBuckets successful;
    private final long reportMinCount;
    private final RankingPolicy rankingPolicy;
    private final RankingFallback rankingFallback;
    private final AtomicReference<List<RankedKeyword>> cachedRankings = new AtomicReference<>(List.of());

    public SearchKeywordService(
        SearchKeywordDictionary dictionary,
        KeywordBuckets successful,
        long minCount,
        long reportMinCount,
        Set<String> blockedIds,
        RankingFallback rankingFallback
    ) {
        if (minCount < 1 || reportMinCount < 1) {
            throw new IllegalArgumentException("Minimum counts must be positive");
        }
        this.dictionary = dictionary;
        this.successful = successful;
        this.reportMinCount = reportMinCount;
        this.rankingPolicy = new RankingPolicy(minCount, SearchKeywordPolicy.RANKING_SIZE, blockedIds);
        this.rankingFallback = rankingFallback;
    }

    @Override
    public void completed(SearchKeyword keyword, long totalElements) {
        if (totalElements <= 0) {
            return;
        }
        successful.record(keyword.text());
    }

    public List<RankedKeyword> rankings() {
        return cachedRankings.get();
    }

    public void refreshRankings() {
        try {
            Map<String, Long> counts = successful.view().counts();
            cachedRankings.set(KeywordRanking.of(counts, dictionary, rankingPolicy, rankingFallback));
            logCoverage(KeywordCoverage.of(counts, dictionary));
        } catch (RuntimeException exception) {
            log.warn("event=search_keyword_rankings_refresh_failed");
        }
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
            KeywordCoverage.of(view.counts(), dictionary),
            ReportSection.unresolvedOf(view, dictionary, reportMinCount),
            KeywordRanking.shadowOf(view.counts(), rankingPolicy)
        );
    }
}
