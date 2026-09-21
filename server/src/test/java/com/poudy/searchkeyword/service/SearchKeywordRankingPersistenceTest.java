package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.poudy.product.repository.ProductRepository;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.BucketWindow;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingChange;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.KeywordBucketRepository;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class SearchKeywordRankingPersistenceTest {
    private static final Instant RECORDED_AT = Instant.parse("2020-09-09T00:00:00Z");
    private static final Clock AFTER_BOUNDARY = Clock.fixed(RECORDED_AT.plusSeconds(600), ZoneOffset.UTC);

    @Autowired
    private KeywordBucketRepository repository;

    @Autowired
    private SearchKeywordDictionaryRepository dictionaries;
    @Autowired
    private ProductRepository products;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private EntityManager entityManager;

    @Test
    void databaseDictionaryChangesArePublishedWithoutRecreatingServices() {
        SearchKeywordSnapshot snapshot = new SearchKeywordSnapshot(dictionaries.read());
        KeywordBuckets buckets = new KeywordBuckets(AFTER_BOUNDARY, new BucketWindow(168, 600, 0), repository);
        SearchKeywordService reader = new SearchKeywordService(snapshot, buckets, products::hasSearchResults);
        SearchKeywordRankingService refresh = new SearchKeywordRankingService(
            dictionaries,
            buckets,
            products::hasSearchResults,
            new RankingPolicy(5, 10, Set.of()),
            RankingFallback.of(List.of()),
            snapshot,
            AFTER_BOUNDARY
        );
        jdbc.update(
            "insert into search_keyword (id, keyword, status, ranking_eligible) values ('refresh-test', '토너', 'ACTIVE', true)"
        );
        jdbc.update(
            "insert into search_keyword_expression (expression_key, keyword_id) values ('신규표현', 'refresh-test')"
        );
        for (int count = 0; count < 5; count++) {
            repository.increase(RECORDED_AT, "신규표현");
        }

        refresh.refreshRankings();

        assertThat(reader.rankings()).extracting(RankedKeyword::keyword).containsExactly("토너");
        assertThat(snapshot.recognizes("신규표현")).isTrue();

        jdbc.update("update search_keyword set status = 'INACTIVE' where id = 'refresh-test'");
        entityManager.clear();
        refresh.refreshRankings();

        assertThat(reader.rankings()).isEmpty();
        assertThat(snapshot.recognizes("신규표현")).isFalse();
    }

    @Test
    void restartBuildsTheSameRankingFromSavedCountsOnFirstRefresh() {
        TestServices recorder = service(
            new KeywordBuckets(Clock.fixed(RECORDED_AT, ZoneOffset.UTC), new BucketWindow(168, 600, 0), repository)
        );
        for (int i = 0; i < 5; i++) {
            recorder.record(new SearchKeyword("토너"));
        }

        TestServices restarted = service(
            new KeywordBuckets(AFTER_BOUNDARY, new BucketWindow(168, 600, 0), repository)
        );
        assertThat(restarted.rankings()).isEmpty();
        restarted.refreshRankings();

        assertThat(restarted.rankings()).containsExactly(new RankedKeyword(1, "토너", RankingChange.unknown()));
    }

    private static TestServices service(KeywordBuckets buckets) {
        DictionaryEntry entry = DictionaryEntry.of("term", "토너", DictionaryEntry.Status.ACTIVE, true, List.of("토너"));
        SearchKeywordDictionary dictionary = SearchKeywordDictionary.of(List.of(entry));
        SearchKeywordDictionaryRepository dictionaries = mock(SearchKeywordDictionaryRepository.class);
        when(dictionaries.read()).thenReturn(dictionary);
        SearchKeywordSnapshot snapshot = new SearchKeywordSnapshot(dictionary);
        return new TestServices(
            new SearchKeywordService(snapshot, buckets, ignored -> true),
            new SearchKeywordRankingService(
                dictionaries,
                buckets,
                ignored -> true,
                new RankingPolicy(5, 10, Set.of()),
                RankingFallback.of(List.of()),
                snapshot,
                AFTER_BOUNDARY
            )
        );
    }

    private record TestServices(SearchKeywordService service, SearchKeywordRankingService refresh) {
        void record(SearchKeyword keyword) {
            service.record(keyword);
        }

        List<RankedKeyword> rankings() {
            return service.rankings();
        }

        void refreshRankings() {
            refresh.refreshRankings();
        }
    }
}
