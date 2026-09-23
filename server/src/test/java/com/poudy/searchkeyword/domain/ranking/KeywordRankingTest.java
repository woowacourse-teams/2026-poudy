package com.poudy.searchkeyword.domain.ranking;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry.Status;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class KeywordRankingTest {

    private static final RankingPolicy POLICY = new RankingPolicy(5, 10, Set.of());

    @Test
    void countsBelowTheMinimumAreCollectedButNotPublished() {
        SearchKeywordDictionary dictionary = dictionary(entry("term:1", "토너"), entry("term:2", "크림"));

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 5L, "크림", 4L),
            dictionary,
            POLICY,
            RankingFallback.of(List.of())
        );

        assertThat(rankings).containsExactly(new RankedKeyword(1, "토너", RankingChange.unknown()));
    }

    @Test
    void sumsEveryInputLinkedToOneKeyword() {
        DictionaryEntry toner = DictionaryEntry.of("term:1", "토너", Status.ACTIVE, true, List.of("토너", "toner"));
        SearchKeywordDictionary dictionary = dictionary(toner, entry("term:2", "크림"));

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 3L, "toner", 3L, "크림", 5L),
            dictionary,
            POLICY,
            RankingFallback.of(List.of())
        );

        assertThat(rankings).containsExactly(
            new RankedKeyword(1, "토너", RankingChange.unknown()),
            new RankedKeyword(2, "크림", RankingChange.unknown())
        );
    }

    @Test
    void ordersTiesByNormalizedKeywordThenId() {
        SearchKeywordDictionary dictionary = dictionary(
            entry("term:2", "크림"),
            entry("term:1", "토너"),
            entry("term:3", "크림오일")
        );

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 5L, "크림", 5L, "크림오일", 5L),
            dictionary,
            POLICY,
            RankingFallback.of(List.of())
        );

        assertThat(rankings).containsExactly(
            new RankedKeyword(1, "크림", RankingChange.unknown()),
            new RankedKeyword(2, "크림오일", RankingChange.unknown()),
            new RankedKeyword(3, "토너", RankingChange.unknown())
        );
    }

    @Test
    void keepsOnlyTheConfiguredSize() {
        SearchKeywordDictionary dictionary = dictionary(
            entry("term:1", "토너"),
            entry("term:2", "크림"),
            entry("term:3", "세럼")
        );

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 9L, "크림", 8L, "세럼", 7L),
            dictionary,
            new RankingPolicy(5, 2, Set.of()),
            RankingFallback.of(List.of())
        );

        assertThat(rankings).containsExactly(
            new RankedKeyword(1, "토너", RankingChange.unknown()),
            new RankedKeyword(2, "크림", RankingChange.unknown())
        );
    }

    @Test
    void blockedKeywordsLeaveTheirRankToTheNextCandidate() {
        SearchKeywordDictionary dictionary = dictionary(entry("term:1", "토너"), entry("term:2", "크림"));

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 9L, "크림", 8L),
            dictionary,
            new RankingPolicy(5, 10, Set.of("term:1")),
            RankingFallback.of(List.of())
        );

        assertThat(rankings).containsExactly(new RankedKeyword(1, "크림", RankingChange.unknown()));
    }

    @Test
    void unresolvedAndIneligibleInputsNeverReachTheRanking() {
        DictionaryEntry inactive = entry("term:2", "크림", Status.INACTIVE, true);
        DictionaryEntry ineligible = entry("term:3", "세럼", Status.ACTIVE, false);
        SearchKeywordDictionary dictionary = dictionary(entry("term:1", "토너"), inactive, ineligible);

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 5L, "크림", 9L, "세럼", 9L, "미해석", 9L),
            dictionary,
            POLICY,
            RankingFallback.of(List.of())
        );

        assertThat(rankings).containsExactly(new RankedKeyword(1, "토너", RankingChange.unknown()));
    }

    @Test
    void fillsEmptySlotsWithTheDefaultKeywordsWithoutDuplicating() {
        SearchKeywordDictionary dictionary = dictionary(
            entry("term:1", "토너"),
            entry("term:2", "크림"),
            entry("term:3", "세럼")
        );
        RankingFallback fallback = RankingFallback.of(List.of("크림", "세럼"));

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 9L, "크림", 5L),
            dictionary,
            new RankingPolicy(5, 3, Set.of()),
            fallback
        );

        assertThat(rankings).containsExactly(
            new RankedKeyword(1, "토너", RankingChange.unknown()),
            new RankedKeyword(2, "크림", RankingChange.unknown()),
            new RankedKeyword(3, "세럼", RankingChange.unknown())
        );
    }

    @Test
    void marksMovementAgainstTheRankingOfOneDayEarlier() {
        SearchKeywordDictionary dictionary = dictionary(
            entry("term:1", "토너"),
            entry("term:2", "크림"),
            entry("term:3", "세럼")
        );

        List<RankedKeyword> rankings = rank(
            Map.of("토너", 9L, "크림", 8L, "세럼", 7L),
            Map.of("크림", 9L, "토너", 8L),
            dictionary,
            POLICY,
            RankingFallback.of(List.of())
        );

        assertThat(rankings).containsExactly(
            new RankedKeyword(1, "토너", RankingChange.moved(2, 1)),
            new RankedKeyword(2, "크림", RankingChange.moved(1, 2)),
            new RankedKeyword(3, "세럼", RankingChange.entered())
        );
    }

    @Test
    void leavesMovementUnknownWithoutComparisonAndForDefaultKeywords() {
        SearchKeywordDictionary dictionary = dictionary(entry("term:1", "토너"), entry("term:2", "크림"));

        List<RankedKeyword> withoutComparison = rank(
            Map.of("토너", 9L),
            dictionary,
            POLICY,
            RankingFallback.of(List.of())
        );
        List<RankedKeyword> filled = rank(
            Map.of("토너", 9L),
            Map.of("토너", 9L),
            dictionary,
            POLICY,
            RankingFallback.of(List.of("크림"))
        );

        assertThat(withoutComparison.getFirst().change().isKnown()).isFalse();
        assertThat(filled.get(0).change()).isEqualTo(RankingChange.moved(1, 1));
        assertThat(filled.get(1).change().isKnown()).isFalse();
    }

    private static List<RankedKeyword> rank(
        Map<String, Long> counts,
        SearchKeywordDictionary dictionary,
        RankingPolicy policy,
        RankingFallback fallback
    ) {
        return KeywordRanking.of(
            names(counts, dictionary, policy),
            Optional.empty(),
            fallback.candidates(dictionary).stream().map(DictionaryEntry::keyword).distinct().toList(),
            policy.size()
        );
    }

    private static List<RankedKeyword> rank(
        Map<String, Long> counts,
        Map<String, Long> compared,
        SearchKeywordDictionary dictionary,
        RankingPolicy policy,
        RankingFallback fallback
    ) {
        return KeywordRanking.of(
            names(counts, dictionary, policy),
            Optional.of(names(compared, dictionary, policy)),
            fallback.candidates(dictionary).stream().map(DictionaryEntry::keyword).distinct().toList(),
            policy.size()
        );
    }

    private static List<String> names(
        Map<String, Long> counts,
        SearchKeywordDictionary dictionary,
        RankingPolicy policy
    ) {
        return KeywordRanking.candidates(counts, dictionary, policy).stream().limit(policy.size())
            .map(DictionaryEntry::keyword).toList();
    }

    private static SearchKeywordDictionary dictionary(DictionaryEntry... entries) {
        return SearchKeywordDictionary.of(List.of(entries));
    }

    private static DictionaryEntry entry(String id, String keyword) {
        return entry(id, keyword, Status.ACTIVE, true);
    }

    private static DictionaryEntry entry(String id, String keyword, Status status, boolean eligible) {
        return DictionaryEntry.of(id, keyword, status, eligible, List.of(keyword));
    }
}
