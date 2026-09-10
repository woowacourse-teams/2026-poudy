package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.ReportItem;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class SearchKeywordServiceTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-09-08T10:30:00Z"), ZoneOffset.UTC);
    private final KeywordBuckets successful = new KeywordBuckets(clock, 168);

    @Test
    void mergesAliasesAcrossKindsButKeepsProductAndGeneralTermSeparate() {
        var service = service(
            List.of(
                entry("term", "PDRN", "PDRN"),
                entry("brand", "라운드랩", "라운드랩"),
                entry("product", "라운드랩 1025 독도 토너", "독도 토너", "ㄷㄷㅌㄴ")
            ),
            Set.of()
        );
        for (int i = 0; i < 3; i++) {
            service.completed(new SearchKeyword("pdrn"), 20);
            service.completed(new SearchKeyword("PDRN"), 20);
        }
        for (int i = 0; i < 4; i++) {
            service.completed(new SearchKeyword("독도 토너"), 4);
        }
        service.refreshRankings();
        assertThat(service.rankings()).extracting(RankedKeyword::keyword).containsExactly("PDRN");
        service.completed(new SearchKeyword("ㄷㄷㅌㄴ"), 1);
        for (int i = 0; i < 5; i++) {
            service.completed(new SearchKeyword("라운드랩"), 40);
        }
        service.refreshRankings();
        assertThat(service.rankings()).extracting(RankedKeyword::keyword)
            .containsExactly("PDRN", "라운드랩", "라운드랩 1025 독도 토너");
        assertThat(successful.view().counts()).containsEntry("독도토너", 4L).containsEntry("ㄷㄷㅌㄴ", 1L);
    }

    @Test
    void retainsUnresolvedSuccessfulInputsAndReinterpretsThemAfterDictionaryReplacement() {
        var old = service(List.of(entry("term", "토너", "토너")), Set.of());
        for (int i = 0; i < 5; i++) {
            old.completed(new SearchKeyword("독도 토너"), 1);
            old.completed(new SearchKeyword("토너"), 0);
        }
        old.refreshRankings();
        assertThat(old.rankings()).isEmpty();
        var updated = service(List.of(entry("product", "라운드랩 1025 독도 토너", "독도 토너")), Set.of());
        updated.refreshRankings();
        assertThat(updated.rankings()).containsExactly(new RankedKeyword(1, "라운드랩 1025 독도 토너"));
        assertThat(successful.view().counts()).containsOnlyKeys("독도토너");
    }

    @Test
    void shadowRankingRanksInputsThatTheDictionaryCannotResolve() {
        var service = service(List.of(entry("term", "토너", "토너")), Set.of());
        for (int i = 0; i < 5; i++) {
            service.completed(new SearchKeyword("토너"), 1);
        }
        for (int i = 0; i < 9; i++) {
            service.completed(new SearchKeyword("사전에없는말"), 1);
        }
        service.completed(new SearchKeyword("적은입력"), 1);

        var report = service.report("catalog", "code");

        assertThat(report.shadowRanking()).containsExactly(
            new RankedKeyword(1, "사전에없는말"),
            new RankedKeyword(2, "토너")
        );
        service.refreshRankings();
        assertThat(service.rankings()).containsExactly(new RankedKeyword(1, "토너"));
    }

    @Test
    void keepsOnlyInputsWithResultsAndSeparatesReportThreshold() {
        var service = service(List.of(entry("term", "토너", "토너")), Set.of());
        for (int i = 0; i < 20; i++) {
            service.completed(new SearchKeyword("없는검색"), 0);
        }
        for (int i = 0; i < 19; i++) {
            service.completed(new SearchKeyword("미등록"), 1);
        }
        assertThat(service.report("catalog", "code").nonzeroUnresolved().items()).isEmpty();
        service.completed(new SearchKeyword("미등록"), 1);
        assertThat(service.report("catalog", "code").nonzeroUnresolved().items())
            .extracting(ReportItem::normalizedQuery, ReportItem::count)
            .containsExactly(tuple("미등록", 20L));
        assertThat(successful.view().counts()).containsOnlyKeys("미등록");
        service.refreshRankings();
        assertThat(service.rankings()).isEmpty();
    }

    @Test
    void reportShowsUnresolvedInputsAsTyped() {
        var service = service(List.of(entry("term", "토너", "토너")), Set.of());
        for (int i = 0; i < 20; i++) {
            service.completed(new SearchKeyword("a@example.com"), 1);
            service.completed(new SearchKeyword("미등록"), 1);
        }
        assertThat(successful.view().counts()).containsKeys("a@example.com", "미등록");
        assertThat(service.report("catalog", "code").nonzeroUnresolved().items())
            .extracting(ReportItem::normalizedQuery, ReportItem::count)
            .containsExactly(
                tuple("a@example.com", 20L),
                tuple("미등록", 20L)
            );
        assertThat(service.report("catalog", "code").shadowRanking())
            .containsExactly(new RankedKeyword(1, "a@example.com"), new RankedKeyword(2, "미등록"));
    }

    @Test
    void appliesBlockBeforeTopTenAndUsesIdsForFinalTie() {
        List<DictionaryEntry> entries = java.util.stream.IntStream.range(0, 12)
            .mapToObj(i -> entry("id%02d".formatted(i), "토너", "표현" + (char) ('a' + i))).toList();
        var service = service(entries, Set.of("id00"));
        for (var entry : entries) {
            for (int i = 0; i < 5; i++) {
                service.completed(new SearchKeyword(entry.expressions().iterator().next()), 1);
            }
        }
        service.refreshRankings();
        assertThat(service.rankings()).hasSize(10);
        service.refreshRankings();
        assertThat(service.rankings()).extracting(RankedKeyword::rank)
            .containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    }

    @Test
    void servesImmutableLastRefreshWhileReadersRaceWithRefresh() throws Exception {
        var service = service(List.of(entry("term", "토너", "토너"), entry("cream", "크림", "크림")), Set.of());
        for (int i = 0; i < 5; i++) {
            service.completed(new SearchKeyword("토너"), 1);
        }
        assertThat(service.rankings()).isEmpty();
        service.refreshRankings();
        List<RankedKeyword> published = service.rankings();
        assertThat(published).containsExactly(new RankedKeyword(1, "토너"));
        assertThatThrownBy(() -> published.add(new RankedKeyword(2, "크림")))
            .isInstanceOf(UnsupportedOperationException.class);

        for (int i = 0; i < 6; i++) {
            service.completed(new SearchKeyword("크림"), 1);
        }
        assertThat(service.rankings()).containsExactly(new RankedKeyword(1, "토너"));

        ExecutorService readers = Executors.newFixedThreadPool(4);
        List<Future<List<RankedKeyword>>> futures = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            futures.add(readers.submit(service::rankings));
            service.refreshRankings();
        }
        readers.shutdown();
        assertThat(readers.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        for (Future<List<RankedKeyword>> future : futures) {
            assertThat(future.get()).isIn(
                List.of(new RankedKeyword(1, "토너")),
                List.of(
                    new RankedKeyword(1, "크림"),
                    new RankedKeyword(2, "토너")
                )
            );
        }
        service.refreshRankings();
        assertThat(service.rankings()).containsExactly(
            new RankedKeyword(1, "크림"),
            new RankedKeyword(2, "토너")
        );
    }

    @Test
    void preservesPreviousCacheWhenRefreshFails() {
        var throwingClock = new ThrowingClock(Instant.parse("2026-09-08T10:30:00Z"));
        var ranking = new KeywordBuckets(throwingClock, 168);
        var failing = new SearchKeywordService(
            new SearchKeywordDictionary("v1", List.of(entry("term", "토너", "토너")), ignored -> true),
            ranking,
            5,
            20,
            Set.of()
        );
        for (int i = 0; i < 5; i++) {
            failing.completed(new SearchKeyword("토너"), 1);
        }
        failing.refreshRankings();
        var previous = failing.rankings();
        throwingClock.fail = true;
        assertThat(failing.rankings()).isEqualTo(previous);
        failing.refreshRankings();
        assertThat(failing.rankings()).isEqualTo(previous);
    }

    @Test
    void refreshAfterRetentionExpiryPublishesEmptyCache() {
        var mutable = new MutableClock(Instant.parse("2026-09-08T10:30:00Z"));
        var ranking = new KeywordBuckets(mutable, 1, 60);
        var service = new SearchKeywordService(
            new SearchKeywordDictionary("v1", List.of(entry("term", "토너", "토너")), ignored -> true),
            ranking,
            5,
            20,
            Set.of()
        );
        for (int i = 0; i < 5; i++) {
            service.completed(new SearchKeyword("토너"), 1);
        }
        service.refreshRankings();
        assertThat(service.rankings()).hasSize(1);
        mutable.now = mutable.now.plus(2, java.time.temporal.ChronoUnit.HOURS);
        service.refreshRankings();
        assertThat(service.rankings()).isEmpty();
    }

    @Test
    void refreshValidatesOnlyTopTenCandidatesAndSkipsBelowMinimum() {
        AtomicInteger calls = new AtomicInteger();
        List<DictionaryEntry> entries = java.util.stream.IntStream.range(0, 20)
            .mapToObj(i -> entry("term%02d".formatted(i), "검색어%02d".formatted(i), "표현%02d".formatted(i))).toList();
        var dictionary = new SearchKeywordDictionary("v1", entries, ignored -> {
            calls.incrementAndGet();
            return true;
        });
        var ranking = new KeywordBuckets(clock, 168);
        var service = new SearchKeywordService(
            dictionary,
            ranking,
            5,
            20,
            Set.of()
        );
        for (DictionaryEntry entry : entries) {
            for (int i = 0; i < (entry.id().endsWith("19") ? 1 : 5); i++) {
                service.completed(new SearchKeyword(entry.expressions().iterator().next()), 1);
            }
        }
        assertThat(service.rankings()).isEmpty();
        assertThat(calls).hasValue(0);
        service.refreshRankings();
        assertThat(service.rankings()).hasSize(10);
        assertThat(calls).hasValue(10);
        service.refreshRankings();
        assertThat(calls).hasValue(10);
    }

    @Test
    void skipsBelowMinimumAndBlockedCandidatesBeforeCatalogValidation() {
        AtomicInteger calls = new AtomicInteger();
        List<DictionaryEntry> entries = List.of(
            entry("qualified", "자격", "자격"),
            entry("below", "부족", "부족"),
            entry("blocked", "차단", "차단")
        );
        var dictionary = new SearchKeywordDictionary("v1", entries, ignored -> {
            calls.incrementAndGet();
            return true;
        });
        var ranking = new KeywordBuckets(clock, 168);
        var service = new SearchKeywordService(
            dictionary,
            ranking,
            5,
            20,
            Set.of("blocked")
        );
        for (int i = 0; i < 5; i++) {
            service.completed(new SearchKeyword("자격"), 1);
        }
        for (int i = 0; i < 4; i++) {
            service.completed(new SearchKeyword("부족"), 1);
        }
        for (int i = 0; i < 10; i++) {
            service.completed(new SearchKeyword("차단"), 1);
        }
        service.refreshRankings();
        assertThat(service.rankings()).containsExactly(new RankedKeyword(1, "자격"));
        assertThat(calls).hasValue(1);
    }

    private static class MutableClock extends Clock {
        private Instant now;
        private MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }

    private static final class ThrowingClock extends MutableClock {
        private boolean fail;
        private ThrowingClock(Instant now) {
            super(now);
        }

        @Override
        public Instant instant() {
            if (fail) {
                throw new IllegalStateException("test clock failure");
            }
            return super.instant();
        }
    }

    private SearchKeywordService service(List<DictionaryEntry> entries, Set<String> blocked) {
        return new SearchKeywordService(
            new SearchKeywordDictionary("v1", entries, ignored -> true),
            successful,
            5,
            20,
            blocked
        );
    }

    private DictionaryEntry entry(String id, String keyword, String... aliases) {
        var kind = id.equals("brand") ? DictionaryEntry.Kind.BRAND : id.equals("product")
            ? DictionaryEntry.Kind.PRODUCT : DictionaryEntry.Kind.TERM;
        return new DictionaryEntry(
            id,
            kind,
            keyword,
            DictionaryEntry.Status.ACTIVE,
            true,
            List.of(aliases),
            List.of(aliases).stream().collect(
                Collectors.toMap(a -> new SearchKeyword(a).value(), a -> DictionaryEntry.ExpressionType.REVIEWED_ALIAS)
            )
        );
    }
}
