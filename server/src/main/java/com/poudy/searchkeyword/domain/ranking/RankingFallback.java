package com.poudy.searchkeyword.domain.ranking;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import java.util.List;
import java.util.Optional;

public final class RankingFallback {

    private final List<String> keywords;

    public RankingFallback(List<String> keywords) {
        this.keywords = keywords.stream().map(keyword -> new SearchKeyword(keyword).text()).toList();
    }

    public static RankingFallback none() {
        return new RankingFallback(List.of());
    }

    List<String> publishableNames(SearchKeywordDictionary dictionary) {
        return keywords.stream()
            .map(dictionary::resolve)
            .flatMap(Optional::stream)
            .filter(dictionary::validateForRanking)
            .map(DictionaryEntry::keyword)
            .distinct()
            .toList();
    }
}
