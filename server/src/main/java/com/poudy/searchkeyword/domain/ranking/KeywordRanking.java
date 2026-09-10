package com.poudy.searchkeyword.domain.ranking;

import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

/** The public projection of collected counts. Ordering and exposure rules live here, not in the caller. */
public final class KeywordRanking {

    private KeywordRanking() {
    }

    public static List<RankedKeyword> of(
        Map<String, Long> counts,
        SearchKeywordDictionary dictionary,
        RankingPolicy policy
    ) {
        Map<String, Long> totals = new HashMap<>();
        Map<String, DictionaryEntry> entries = new HashMap<>();
        counts.forEach((key, count) -> dictionary.resolve(key).ifPresent(entry -> {
            totals.merge(entry.id(), count, Math::addExact);
            entries.put(entry.id(), entry);
        }));
        List<DictionaryEntry> selected = totals.entrySet().stream()
            .filter(entry -> entry.getValue() >= policy.minCount())
            .map(entry -> entries.get(entry.getKey()))
            .sorted(order(totals))
            .filter(entry -> policy.publishes(entry.id()))
            .filter(dictionary::validateForRanking)
            .limit(policy.size())
            .toList();
        return IntStream.range(0, selected.size())
            .mapToObj(index -> new RankedKeyword(index + 1, selected.get(index).keyword()))
            .toList();
    }

    /** Dictionary-free projection of the same counts, for comparing what the dictionary gains or loses. */
    public static List<RankedKeyword> shadowOf(Map<String, Long> counts, RankingPolicy policy) {
        List<String> selected = counts.entrySet().stream()
            .filter(entry -> entry.getValue() >= policy.minCount())
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
            .limit(policy.size())
            .map(Map.Entry::getKey)
            .toList();
        return IntStream.range(0, selected.size())
            .mapToObj(index -> new RankedKeyword(index + 1, selected.get(index)))
            .toList();
    }

    private static Comparator<DictionaryEntry> order(Map<String, Long> totals) {
        return Comparator.<DictionaryEntry>comparingLong(entry -> totals.get(entry.id())).reversed()
            .thenComparing(DictionaryEntry::normalizedKeyword)
            .thenComparing(DictionaryEntry::id);
    }
}
