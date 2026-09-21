package com.poudy.searchkeyword.domain.ranking;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
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

    public List<DictionaryEntry> candidates(SearchKeywordDictionary dictionary) {
        return keywords.stream()
            .map(dictionary::resolve)
            .flatMap(Optional::stream)
            .filter(DictionaryEntry::isRankable)
            .distinct()
            .toList();
    }
}
