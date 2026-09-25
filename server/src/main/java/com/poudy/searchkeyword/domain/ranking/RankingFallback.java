package com.poudy.searchkeyword.domain.ranking;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public final class RankingFallback {

    private final List<String> keywords;

    private RankingFallback(List<String> keywords) {
        this.keywords = keywords;
    }

    public static RankingFallback of(List<String> keywords) {
        List<String> normalized = keywords.stream().map(keyword -> new SearchKeyword(keyword).text()).toList();
        return new RankingFallback(normalized);
    }

    public static RankingFallback configured(String configured) {
        if (configured.isBlank()) {
            return of(SearchKeywordPolicy.DEFAULT_KEYWORDS);
        }
        List<String> keywords = Arrays.stream(configured.split(","))
            .map(String::trim)
            .filter(keyword -> !keyword.isBlank())
            .toList();
        return of(keywords);
    }

    public List<DictionaryEntry> candidates(SearchKeywordDictionary dictionary) {
        return keywords.stream()
            .map(dictionary::resolve)
            .flatMap(Optional::stream)
            .filter(DictionaryEntry::isRankable)
            .distinct()
            .toList();
    }
}
