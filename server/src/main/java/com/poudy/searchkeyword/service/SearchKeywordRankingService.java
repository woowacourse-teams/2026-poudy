package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.domain.bucket.KeywordBucketView;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.KeywordCoverage;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.KeywordRanking;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import jakarta.annotation.PostConstruct;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SearchKeywordRankingService {
    private static final Logger log = LoggerFactory.getLogger(SearchKeywordRankingService.class);
    private final SearchKeywordDictionaryRepository repository;
    private final KeywordBuckets buckets;
    private final KeywordSearch search;
    private final RankingPolicy policy;
    private final RankingFallback fallback;
    private final SearchKeywordSnapshot snapshot;
    private final Clock clock;
    private boolean applicationReady;

    public SearchKeywordRankingService(
        SearchKeywordDictionaryRepository repository,
        KeywordBuckets buckets,
        KeywordSearch search,
        RankingPolicy policy,
        RankingFallback fallback,
        SearchKeywordSnapshot snapshot,
        Clock clock
    ) {
        this.repository = repository;
        this.buckets = buckets;
        this.search = search;
        this.policy = policy;
        this.fallback = fallback;
        this.snapshot = snapshot;
        this.clock = clock;
    }

    @PostConstruct
    void initializeDictionary() {
        snapshot.initialize(repository.read());
    }

    @EventListener(ApplicationReadyEvent.class)
    public synchronized void refreshAfterApplicationReady() {
        if (applicationReady) {
            return;
        }
        refreshRankings();
        applicationReady = true;
    }

    @Scheduled(cron = SearchKeywordPolicy.REFRESH_CRON)
    public synchronized void refreshOnSchedule() {
        if (!applicationReady) {
            return;
        }
        refreshRankings();
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
            snapshot.replace(dictionary, rankings, clock.instant());
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
