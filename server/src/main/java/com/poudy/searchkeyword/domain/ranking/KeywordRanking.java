package com.poudy.searchkeyword.domain.ranking;

import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

public final class KeywordRanking {

    private KeywordRanking() {
    }

    public static List<RankedKeyword> of(
        Map<String, Long> counts,
        SearchKeywordDictionary dictionary,
        RankingPolicy policy
    ) {
        return of(counts, dictionary, policy, RankingFallback.none());
    }

    public static List<RankedKeyword> of(
        Map<String, Long> counts,
        SearchKeywordDictionary dictionary,
        RankingPolicy policy,
        RankingFallback fallback
    ) {
        List<String> published = new ArrayList<>(counted(counts, dictionary, policy));
        fallback.publishableNames(dictionary).stream()
            .filter(name -> !published.contains(name))
            .limit(Math.max(policy.size() - published.size(), 0))
            .forEach(published::add);
        return numbered(published);
    }

    private static List<String> counted(
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
            .filter(dictionary::validateForRanking)
            .limit(policy.size())
            .map(DictionaryEntry::keyword)
            .toList();
    }

    public static List<RankedKeyword> shadowOf(Map<String, Long> counts, RankingPolicy policy) {
        List<String> selected = counts.entrySet().stream()
            .filter(entry -> policy.qualifies(entry.getValue()))
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
            .limit(policy.size())
            .map(Map.Entry::getKey)
            .toList();
        return numbered(selected);
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

    private static List<RankedKeyword> numbered(List<String> keywords) {
        return IntStream.range(0, keywords.size())
            .mapToObj(index -> new RankedKeyword(index + 1, keywords.get(index)))
            .toList();
    }
}
