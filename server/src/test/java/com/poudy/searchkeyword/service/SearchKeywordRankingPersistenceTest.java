package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.bucket.BucketWindow;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingChange;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.KeywordBucketRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class SearchKeywordRankingPersistenceTest {
    private static final Instant RECORDED_AT = Instant.parse("2020-09-09T00:00:00Z");
    private static final Clock AFTER_BOUNDARY = Clock.fixed(RECORDED_AT.plusSeconds(600), ZoneOffset.UTC);

    @Autowired
    private KeywordBucketRepository repository;

    @Test
    void restartBuildsTheSameRankingFromSavedCountsOnFirstRefresh() {
        SearchKeywordService recorder = service(
            new KeywordBuckets(Clock.fixed(RECORDED_AT, ZoneOffset.UTC), new BucketWindow(168, 600, 0), repository)
        );
        for (int i = 0; i < 5; i++) {
            recorder.record(new SearchKeyword("토너"));
        }

        SearchKeywordService restarted = service(
            new KeywordBuckets(AFTER_BOUNDARY, new BucketWindow(168, 600, 0), repository)
        );
        assertThat(restarted.rankings()).isEmpty();
        restarted.refreshRankings();

        assertThat(restarted.rankings()).containsExactly(new RankedKeyword(1, "토너", RankingChange.unknown()));
    }

    private static SearchKeywordService service(KeywordBuckets buckets) {
        DictionaryEntry entry = DictionaryEntry.of("term", "토너", DictionaryEntry.Status.ACTIVE, true, List.of("토너"));
        SearchKeywordDictionary dictionary = SearchKeywordDictionary.of(List.of(entry), ignored -> true);
        return new SearchKeywordService(
            dictionary,
            buckets,
            ignored -> true,
            new RankingPolicy(5, 10, Set.of()),
            RankingFallback.of(List.of())
        );
    }
}
