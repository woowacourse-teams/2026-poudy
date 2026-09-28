package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.bucket.KeywordBucketView;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingChange;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

class SearchKeywordRankingServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-21T00:00:00Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final SearchKeywordDictionaryRepository repository = mock(SearchKeywordDictionaryRepository.class);
    private final KeywordBuckets buckets = mock(KeywordBuckets.class);
    private final SearchKeywordDictionary oldDictionary = dictionary(entry("old", "이전 이름", true, "이전 표현"));
    private final SearchKeywordSnapshot snapshot = new SearchKeywordSnapshot(oldDictionary);

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void refreshReinterpretsCountsAndUpdatesTheDictionaryUsedByTheExistingRecorder(CapturedOutput output) {
        SearchKeywordDictionary changed = dictionary(entry("new", "새 이름", true, "새 표현"));
        SearchKeywordService recorder = new SearchKeywordService(snapshot, buckets, ignored -> true);
        when(repository.read()).thenReturn(changed);
        when(buckets.view()).thenReturn(new KeywordBucketView(Map.of("새 표현", 5L)));
        when(buckets.comparisonView()).thenReturn(Optional.empty());

        refresher(ignored -> true, List.of()).refreshRankings();
        recorder.record(new SearchKeyword("새 표현"));
        recorder.record(new SearchKeyword("이전 표현"));

        assertThat(recorder.rankings()).extracting(RankedKeyword::keyword).containsExactly("새 이름");
        assertThat(snapshot.recognizes("새 표현")).isTrue();
        assertThat(snapshot.recognizes("이전 표현")).isFalse();
        assertThat(snapshot.refreshedAt()).contains(NOW);
        assertThat(output).contains("event=search_keyword_unresolved keyword=\"이전 표현\"")
            .doesNotContain("event=search_keyword_unresolved keyword=\"새 표현\"");
    }

    @ParameterizedTest
    @ValueSource(strings = {"dictionary", "counts", "catalog"})
    void failedRefreshPreservesBothDictionaryAndRankingAndRecoversNextTime(String failure) {
        List<RankedKeyword> previous = List.of(new RankedKeyword(1, "이전 이름", RankingChange.unknown()));
        snapshot.replace(oldDictionary, previous, NOW.minusSeconds(600));
        SearchKeywordDictionary changed = dictionary(entry("new", "새 이름", true, "새 표현"));
        when(repository.read()).thenReturn(changed);
        when(buckets.view()).thenReturn(new KeywordBucketView(Map.of("새 표현", 5L)));
        when(buckets.comparisonView()).thenReturn(Optional.empty());
        AtomicInteger attempts = new AtomicInteger();
        KeywordSearch search = keyword -> {
            if (failure.equals("catalog") && attempts.getAndIncrement() == 0) {
                throw new IllegalStateException("catalog unavailable");
            }
            return true;
        };
        if (failure.equals("dictionary")) {
            when(repository.read()).thenThrow(new IllegalStateException("dictionary unavailable")).thenReturn(changed);
        }
        if (failure.equals("counts")) {
            when(buckets.view()).thenThrow(new IllegalStateException("counts unavailable"))
                .thenReturn(new KeywordBucketView(Map.of("새 표현", 5L)));
        }
        SearchKeywordRankingService refresh = refresher(search, List.of());

        refresh.refreshRankings();

        assertThat(snapshot.rankings()).isEqualTo(previous);
        assertThat(snapshot.recognizes("이전 표현")).isTrue();
        assertThat(snapshot.recognizes("새 표현")).isFalse();
        assertThat(snapshot.refreshedAt()).contains(NOW.minusSeconds(600));

        refresh.refreshRankings();

        assertThat(snapshot.rankings()).extracting(RankedKeyword::keyword).containsExactly("새 이름");
        assertThat(snapshot.recognizes("새 표현")).isTrue();
        assertThat(snapshot.refreshedAt()).contains(NOW);
    }

    @Test
    void countedAndDefaultKeywordsRequireResultsWhileUnrankableAndUnknownDefaultsAreSkipped() {
        when(repository.read()).thenReturn(
            dictionary(
                entry("toner", "토너", true, "토너"),
                entry("cream", "크림", true, "크림"),
                entry("serum", "세럼", false, "세럼"),
                entry("lotion", "로션", true, "로션")
            )
        );
        when(buckets.view()).thenReturn(new KeywordBucketView(Map.of("토너", 9L, "크림", 5L)));
        when(buckets.comparisonView()).thenReturn(Optional.empty());
        java.util.ArrayList<String> checked = new java.util.ArrayList<>();
        refresher(keyword -> {
            checked.add(keyword);
            return !keyword.equals("토너");
        }, List.of("토너", "세럼", "미등록", "크림", "로션", "로션")).refreshRankings();

        assertThat(snapshot.rankings()).extracting(RankedKeyword::keyword).containsExactly("크림", "로션");
        assertThat(checked).containsExactly("토너", "크림", "로션");
        assertThat(snapshot.recognizes("토너")).isTrue();
    }

    @Test
    void sharesCatalogChecksWithinOneRefreshButRechecksAfterAnEmptyResult() {
        when(repository.read()).thenReturn(dictionary(entry("toner", "토너", true, "토너")));
        when(buckets.view()).thenReturn(new KeywordBucketView(Map.of("토너", 5L)));
        when(buckets.comparisonView()).thenReturn(Optional.of(new KeywordBucketView(Map.of("토너", 6L))));
        AtomicInteger calls = new AtomicInteger();
        SearchKeywordRankingService refresh = refresher(keyword -> calls.incrementAndGet() > 1, List.of("토너"));

        refresh.refreshRankings();
        assertThat(snapshot.rankings()).isEmpty();
        assertThat(calls).hasValue(1);
        refresh.refreshRankings();
        assertThat(snapshot.rankings()).containsExactly(new RankedKeyword(1, "토너", RankingChange.moved(1, 1)));
        assertThat(calls).hasValue(2);
    }

    @Test
    void readersKeepThePreviousSnapshotUntilTheWholeRefreshCompletes() throws Exception {
        snapshot.replace(
            oldDictionary,
            List.of(new RankedKeyword(1, "이전 이름", RankingChange.unknown())),
            NOW.minusSeconds(600)
        );
        when(repository.read()).thenReturn(dictionary(entry("new", "새 이름", true, "새 표현")));
        when(buckets.view()).thenReturn(new KeywordBucketView(Map.of("새 표현", 5L)));
        when(buckets.comparisonView()).thenReturn(Optional.empty());
        CountDownLatch checking = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        SearchKeywordRankingService refresh = refresher(keyword -> {
            checking.countDown();
            try {
                if (!finish.await(5, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("test timed out");
                }
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(exception);
            }
            return true;
        }, List.of());
        try (var executor = Executors.newSingleThreadExecutor()) {
            var running = executor.submit(refresh::refreshRankings);
            try {
                assertThat(checking.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(snapshot.rankings()).extracting(RankedKeyword::keyword).containsExactly("이전 이름");
                assertThat(snapshot.recognizes("이전 표현")).isTrue();
                assertThat(snapshot.recognizes("새 표현")).isFalse();
            } finally {
                finish.countDown();
            }
            running.get(5, TimeUnit.SECONDS);
        }
        assertThat(snapshot.rankings()).extracting(RankedKeyword::keyword).containsExactly("새 이름");
        assertThat(snapshot.recognizes("새 표현")).isTrue();
    }

    private SearchKeywordRankingService refresher(KeywordSearch search, List<String> defaults) {
        return new SearchKeywordRankingService(
            repository,
            buckets,
            search,
            new RankingPolicy(5, 10, Set.of()),
            RankingFallback.of(defaults),
            snapshot,
            clock
        );
    }

    private static SearchKeywordDictionary dictionary(DictionaryEntry... entries) {
        return SearchKeywordDictionary.of(List.of(entries));
    }

    private static DictionaryEntry entry(String id, String keyword, boolean eligible, String expression) {
        return DictionaryEntry.of(id, keyword, DictionaryEntry.Status.ACTIVE, eligible, List.of(expression));
    }
}
