package com.poudy.searchkeyword.service;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.observation.ProductSearchObserver;
import com.poudy.searchkeyword.domain.ImprovementReport;
import com.poudy.searchkeyword.domain.KeywordBucketView;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.ReportItem;
import com.poudy.searchkeyword.domain.ReportSection;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.domain.ranking.KeywordRanking;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
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
    private final AtomicReference<List<RankedKeyword>> cachedRankings = new AtomicReference<>(List.of());

    public SearchKeywordService(
        SearchKeywordDictionary dictionary,
        KeywordBuckets successful,
        long minCount,
        long reportMinCount,
        Set<String> blockedIds
    ) {
        if (minCount < 1 || reportMinCount < 1) {
            throw new IllegalArgumentException("Minimum counts must be positive");
        }
        this.dictionary = dictionary;
        this.successful = successful;
        this.reportMinCount = reportMinCount;
        this.rankingPolicy = new RankingPolicy(minCount, SearchKeywordPolicy.RANKING_SIZE, blockedIds);
    }

    @Override
    public void completed(SearchKeyword keyword, long totalElements) {
        // 결과가 없는 입력은 보관하지 않는다. 조사에 필요한 원본은 검색 로그가 갖는다.
        if (totalElements <= 0) {
            return;
        }
        successful.record(keyword.value());
    }

    public List<RankedKeyword> rankings() {
        return cachedRankings.get();
    }

    /** 순위 스레드 하나만 부른다. 바뀐 게 없어도 매번 다시 만든다. 아낄 비용이 수 밀리초뿐이다. */
    public void refreshRankings() {
        try {
            cachedRankings.set(KeywordRanking.of(successful.view().counts(), dictionary, rankingPolicy));
        } catch (RuntimeException exception) {
            log.warn("event=search_keyword_rankings_refresh_failed");
        }
    }

    /** Restricted local export consumes this projection; it is never an HTTP endpoint. */
    public ImprovementReport report(String catalogVersion, String searchVersion) {
        KeywordBucketView positive = successful.view();
        return new ImprovementReport(
            dictionary.version(),
            catalogVersion,
            searchVersion,
            section(positive),
            KeywordRanking.shadowOf(positive.counts(), rankingPolicy)
        );
    }

    private ReportSection section(KeywordBucketView view) {
        List<ReportItem> items = view.counts().entrySet().stream()
            .filter(e -> e.getValue() >= reportMinCount)
            .filter(e -> dictionary.resolve(e.getKey()).isEmpty())
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
            .limit(100).map(e -> new ReportItem(e.getKey(), e.getValue())).toList();
        return new ReportSection(
            view.windowStart(),
            view.observedThrough(),
            view.startedAt(),
            view.clockRegressed(),
            items
        );
    }

}
