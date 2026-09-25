package com.poudy.searchkeyword.domain.ranking;

import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.IntStream;

public final class KeywordRanking {

    private KeywordRanking() {
    }

    public static List<RankedKeyword> of(
        List<String> counted,
        Optional<List<String>> compared,
        List<String> fallback,
        int size
    ) {
        Map<String, Integer> before = compared.map(KeywordRanking::ranksOf).orElse(null);
        List<String> names = new ArrayList<>(counted);
        fallback.stream()
            .filter(name -> !names.contains(name))
            .limit(Math.max(size - names.size(), 0))
            .forEach(names::add);
        return IntStream.range(0, names.size())
            .mapToObj(index -> ranked(names.get(index), index + 1, counted, before))
            .toList();
    }

    private static RankedKeyword ranked(String name, int rank, List<String> counted, Map<String, Integer> before) {
        return new RankedKeyword(rank, name, change(name, rank, counted, before));
    }

    private static RankingChange change(String name, int rank, List<String> counted, Map<String, Integer> before) {
        if (before == null || !counted.contains(name)) {
            return RankingChange.unknown();
        }
        Integer previousRank = before.get(name);
        if (previousRank == null) {
            return RankingChange.entered();
        }
        return RankingChange.moved(previousRank, rank);
    }

    private static Map<String, Integer> ranksOf(List<String> names) {
        Map<String, Integer> ranks = new HashMap<>();
        IntStream.range(0, names.size()).forEach(index -> ranks.put(names.get(index), index + 1));
        return ranks;
    }

    public static List<DictionaryEntry> candidates(
        Map<String, Long> counts,
        SearchKeywordDictionary dictionary,
        RankingPolicy policy
    ) {
        Map<DictionaryEntry, Long> totals = totalsByEntry(counts, dictionary);
        return totals.entrySet().stream()
            .filter(entry -> policy.qualifies(entry.getValue()))
            .map(Map.Entry::getKey)
            .sorted(order(totals))
            .filter(policy::publishes)
            .filter(DictionaryEntry::isRankable)
            .toList();
    }

    private static Map<DictionaryEntry, Long> totalsByEntry(
        Map<String, Long> counts,
        SearchKeywordDictionary dictionary
    ) {
        Map<DictionaryEntry, Long> totals = new HashMap<>();
        counts.forEach(
            (key, count) -> dictionary.resolve(key).ifPresent(entry -> totals.merge(entry, count, Math::addExact))
        );
        return totals;
    }

    private static Comparator<DictionaryEntry> order(Map<DictionaryEntry, Long> totals) {
        return Comparator.<DictionaryEntry>comparingLong(totals::get).reversed()
            .thenComparing(Comparator.naturalOrder());
    }

}
