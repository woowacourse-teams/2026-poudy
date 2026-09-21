package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.KeywordBucketView;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.KeywordCoverage;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.KeywordRanking;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SearchKeywordRankingService {
    private static final Logger log = LoggerFactory.getLogger(SearchKeywordRankingService.class);
    private final SearchKeywordDictionaryRepository repository;
    private final KeywordBuckets buckets;
    private final KeywordSearch search;
    private final RankingPolicy policy;
    private final RankingFallback fallback;
    private final SearchKeywordCache cache;
    private final Clock clock;

    public SearchKeywordRankingService(
        SearchKeywordDictionaryRepository repository,
        KeywordBuckets buckets,
        KeywordSearch search,
        RankingPolicy policy,
        RankingFallback fallback,
        SearchKeywordCache cache,
        Clock clock
    ) {
        this.repository = repository;
        this.buckets = buckets;
        this.search = search;
        this.policy = policy;
        this.fallback = fallback;
        this.cache = cache;
        this.clock = clock;
    }

    public synchronized void refreshRankings() {
        try {
            SearchKeywordDictionary dictionary = repository.read();
            KeywordBucketView view = buckets.view();
            Optional<KeywordBucketView> comparison = buckets.comparisonView();
            Map<String, Boolean> availability = new HashMap<>();
            List<String> counted = available(view.candidates(dictionary, policy), availability).limit(policy.size())
                .toList();
            Optional<List<String>> compared = comparison
                .map(
                    previous -> available(previous.candidates(dictionary, policy), availability).limit(policy.size())
                        .toList()
                );
            List<String> defaults = available(fallback.candidates(dictionary), availability).distinct()
                .limit(policy.size()).toList();
            List<RankedKeyword> rankings = KeywordRanking.of(counted, compared, defaults, policy.size());
            KeywordCoverage coverage = view.coverage(dictionary);
            cache.replace(dictionary, rankings, clock.instant());
            logCoverage(coverage);
        } catch (RuntimeException exception) {
            log.warn("event=search_keyword_rankings_refresh_failed", exception);
        }
    }

    private Stream<String> available(List<DictionaryEntry> candidates, Map<String, Boolean> availability) {
        return candidates.stream()
            .filter(entry -> availability.computeIfAbsent(entry.keyword(), search::hasResults))
            .map(DictionaryEntry::keyword);
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
