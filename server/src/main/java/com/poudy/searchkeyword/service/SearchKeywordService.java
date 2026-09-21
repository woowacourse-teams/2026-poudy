package com.poudy.searchkeyword.service;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SearchKeywordService {

    private static final Logger log = LoggerFactory.getLogger(SearchKeywordService.class);
    private final SearchKeywordCache cache;
    private final KeywordBuckets successful;
    private final KeywordSearch search;

    public SearchKeywordService(
        SearchKeywordCache cache,
        KeywordBuckets successful,
        KeywordSearch search
    ) {
        this.cache = cache;
        this.successful = successful;
        this.search = search;
    }

    public void record(SearchKeyword keyword) {
        if (!search.hasResults(keyword.text())) {
            return;
        }
        successful.record(keyword.text());
        logWhenUnresolved(keyword.text());
    }

    private void logWhenUnresolved(String normalizedQuery) {
        if (cache.recognizes(normalizedQuery)) {
            return;
        }
        log.info("event=search_keyword_unresolved keyword=\"{}\"", quoted(normalizedQuery));
    }

    private static String quoted(String normalizedQuery) {
        return normalizedQuery.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    public List<RankedKeyword> rankings() {
        return cache.rankings();
    }

}
