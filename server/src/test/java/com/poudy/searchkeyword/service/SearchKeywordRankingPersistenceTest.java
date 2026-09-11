package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SearchKeywordRankingPersistenceTest {
    private static final Instant RECORDED_AT = Instant.parse("2026-09-09T00:00:00Z");
    private static final Clock AFTER_BOUNDARY = Clock.fixed(RECORDED_AT.plusSeconds(600), ZoneOffset.UTC);

    @TempDir
    Path directory;

    @Test
    void restartRebuildsTheSameRankingFromRestoredCountsOnFirstRefresh() {
        var recording = new KeywordBuckets(Clock.fixed(RECORDED_AT, ZoneOffset.UTC), 168);
        var recorder = service(recording);
        for (int i = 0; i < 5; i++) {
            recorder.completed(new SearchKeyword("토너"), 1);
        }
        var countsRepository = new KeywordSnapshotRepository(directory.resolve("buckets.json"), 168);
        countsRepository.save(recording.snapshot());

        var running = new KeywordBuckets(AFTER_BOUNDARY, 168);
        running.restore(recording.snapshot());
        var before = service(running);
        before.refreshRankings();

        var restored = new KeywordBuckets(AFTER_BOUNDARY, 168);
        countsRepository.load().ifPresent(restored::restore);
        var after = service(restored);
        assertThat(after.rankings()).isEmpty();
        after.refreshRankings();
        assertThat(after.rankings())
            .isEqualTo(before.rankings())
            .containsExactly(new RankedKeyword(1, "토너"));
    }

    private static SearchKeywordService service(KeywordBuckets buckets) {
        var entry = new DictionaryEntry(
            "term",
            DictionaryEntry.Kind.TERM,
            "토너",
            DictionaryEntry.Status.ACTIVE,
            true,
            List.of("토너"),
            Map.of("토너", DictionaryEntry.ExpressionType.CATALOG)
        );
        var dictionary = new SearchKeywordDictionary("data-v1", List.of(entry), ignored -> true);
        return new SearchKeywordService(dictionary, buckets, 5, 20, Set.of());
    }
}
