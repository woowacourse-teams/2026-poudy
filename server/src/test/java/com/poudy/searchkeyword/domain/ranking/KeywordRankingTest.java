package com.poudy.searchkeyword.domain.ranking;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.DictionaryEntry.ExpressionType;
import com.poudy.searchkeyword.domain.DictionaryEntry.Kind;
import com.poudy.searchkeyword.domain.DictionaryEntry.Status;
import com.poudy.searchkeyword.domain.KeywordSearch;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class KeywordRankingTest {

    private static final RankingPolicy POLICY = new RankingPolicy(5, 10, Set.of());

    @Test
    void countsBelowTheMinimumAreCollectedButNotPublished() {
        SearchKeywordDictionary dictionary = dictionary(entry("term:1", "토너"), entry("term:2", "크림"));

        List<RankedKeyword> rankings = KeywordRanking.of(Map.of("토너", 5L, "크림", 4L), dictionary, POLICY);

        assertThat(rankings).containsExactly(new RankedKeyword(1, "토너"));
    }

    @Test
    void sumsEveryInputLinkedToOneKeyword() {
        DictionaryEntry toner = new DictionaryEntry(
            "term:1",
            Kind.TERM,
            "토너",
            Status.ACTIVE,
            true,
            List.of("토너", "toner"),
            Map.of("토너", ExpressionType.CATALOG, "toner", ExpressionType.REVIEWED_ALIAS)
        );
        SearchKeywordDictionary dictionary = dictionary(toner, entry("term:2", "크림"));

        List<RankedKeyword> rankings = KeywordRanking.of(
            Map.of("토너", 3L, "toner", 3L, "크림", 5L),
            dictionary,
            POLICY
        );

        assertThat(rankings).containsExactly(new RankedKeyword(1, "토너"), new RankedKeyword(2, "크림"));
    }

    @Test
    void ordersTiesByNormalizedKeywordThenId() {
        SearchKeywordDictionary dictionary = dictionary(
            entry("term:2", "크림"),
            entry("term:1", "토너"),
            entry("term:3", "크림오일")
        );

        List<RankedKeyword> rankings = KeywordRanking.of(
            Map.of("토너", 5L, "크림", 5L, "크림오일", 5L),
            dictionary,
            POLICY
        );

        assertThat(rankings).containsExactly(
            new RankedKeyword(1, "크림"),
            new RankedKeyword(2, "크림오일"),
            new RankedKeyword(3, "토너")
        );
    }

    @Test
    void keepsOnlyTheConfiguredSize() {
        SearchKeywordDictionary dictionary = dictionary(
            entry("term:1", "토너"),
            entry("term:2", "크림"),
            entry("term:3", "세럼")
        );

        List<RankedKeyword> rankings = KeywordRanking.of(
            Map.of("토너", 9L, "크림", 8L, "세럼", 7L),
            dictionary,
            new RankingPolicy(5, 2, Set.of())
        );

        assertThat(rankings).containsExactly(new RankedKeyword(1, "토너"), new RankedKeyword(2, "크림"));
    }

    @Test
    void blockedKeywordsLeaveTheirRankToTheNextCandidate() {
        SearchKeywordDictionary dictionary = dictionary(entry("term:1", "토너"), entry("term:2", "크림"));

        List<RankedKeyword> rankings = KeywordRanking.of(
            Map.of("토너", 9L, "크림", 8L),
            dictionary,
            new RankingPolicy(5, 10, Set.of("term:1"))
        );

        assertThat(rankings).containsExactly(new RankedKeyword(1, "크림"));
    }

    @Test
    void unresolvedAndIneligibleInputsNeverReachTheRanking() {
        DictionaryEntry inactive = entry("term:2", "크림", Status.INACTIVE, true);
        DictionaryEntry ineligible = entry("term:3", "세럼", Status.ACTIVE, false);
        SearchKeywordDictionary dictionary = dictionary(entry("term:1", "토너"), inactive, ineligible);

        List<RankedKeyword> rankings = KeywordRanking.of(
            Map.of("토너", 5L, "크림", 9L, "세럼", 9L, "미해석", 9L),
            dictionary,
            POLICY
        );

        assertThat(rankings).containsExactly(new RankedKeyword(1, "토너"));
    }

    @Test
    void keywordsWithoutCatalogResultsAreDropped() {
        SearchKeywordDictionary dictionary = new SearchKeywordDictionary(
            "fixture-v1",
            List.of(entry("term:1", "토너"), entry("term:2", "크림")),
            keyword -> keyword.equals("크림")
        );

        List<RankedKeyword> rankings = KeywordRanking.of(Map.of("토너", 9L, "크림", 5L), dictionary, POLICY);

        assertThat(rankings).containsExactly(new RankedKeyword(1, "크림"));
    }

    @Test
    void fillsEmptySlotsWithTheDefaultKeywordsWithoutDuplicating() {
        SearchKeywordDictionary dictionary = dictionary(
            entry("term:1", "토너"),
            entry("term:2", "크림"),
            entry("term:3", "세럼")
        );
        RankingFallback fallback = new RankingFallback(List.of("크림", "세럼"));

        List<RankedKeyword> rankings = KeywordRanking.of(
            Map.of("토너", 9L, "크림", 5L),
            dictionary,
            new RankingPolicy(5, 3, Set.of()),
            fallback
        );

        assertThat(rankings).containsExactly(
            new RankedKeyword(1, "토너"),
            new RankedKeyword(2, "크림"),
            new RankedKeyword(3, "세럼")
        );
    }

    @Test
    void defaultKeywordsPassTheSameEligibilityAsCountedOnes() {
        SearchKeywordDictionary dictionary = new SearchKeywordDictionary(
            "fixture-v1",
            List.of(entry("term:1", "토너"), entry("term:2", "크림"), entry("term:3", "세럼", Status.ACTIVE, false)),
            keyword -> !keyword.equals("크림")
        );
        RankingFallback fallback = new RankingFallback(List.of("크림", "세럼", "토너", "없는말"));

        List<RankedKeyword> rankings = KeywordRanking.of(Map.of(), dictionary, POLICY, fallback);

        assertThat(rankings).containsExactly(new RankedKeyword(1, "토너"));
    }

    @Test
    void shadowRankingCountsInputsWithoutTheDictionary() {
        List<RankedKeyword> shadow = KeywordRanking.shadowOf(
            Map.of("토너", 9L, "ㄷㄷㅌㄴ", 8L, "사전에없는말", 7L, "적은입력", 4L),
            POLICY
        );

        assertThat(shadow).containsExactly(
            new RankedKeyword(1, "토너"),
            new RankedKeyword(2, "ㄷㄷㅌㄴ"),
            new RankedKeyword(3, "사전에없는말")
        );
    }

    @Test
    void shadowRankingKeepsTheSameThresholdAndSizeAsThePublicRanking() {
        Map<String, Long> counts = Map.of("가", 9L, "나", 8L, "다", 7L, "라", 6L);

        assertThat(KeywordRanking.shadowOf(counts, new RankingPolicy(5, 2, Set.of())))
            .containsExactly(new RankedKeyword(1, "가"), new RankedKeyword(2, "나"));
        assertThat(KeywordRanking.shadowOf(counts, new RankingPolicy(7, 10, Set.of()))).hasSize(3);
    }

    private static SearchKeywordDictionary dictionary(DictionaryEntry... entries) {
        KeywordSearch search = keyword -> true;
        return new SearchKeywordDictionary("fixture-v1", List.of(entries), search);
    }

    private static DictionaryEntry entry(String id, String keyword) {
        return entry(id, keyword, Status.ACTIVE, true);
    }

    private static DictionaryEntry entry(String id, String keyword, Status status, boolean eligible) {
        return new DictionaryEntry(
            id,
            Kind.TERM,
            keyword,
            status,
            eligible,
            List.of(keyword),
            Map.of(new SearchKeyword(keyword).value(), ExpressionType.CATALOG)
        );
    }
}
