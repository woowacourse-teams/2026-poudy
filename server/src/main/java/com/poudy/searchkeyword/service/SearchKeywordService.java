package com.poudy.searchkeyword.service;

import com.poudy.exception.InfrastructureException;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SearchKeywordService {

    private static final Logger log = LoggerFactory.getLogger(SearchKeywordService.class);
    private final SearchKeywordSnapshot snapshot;
    private final KeywordBuckets successful;
    private final KeywordSearch search;

    public SearchKeywordService(
        SearchKeywordSnapshot snapshot,
        KeywordBuckets successful,
        KeywordSearch search
    ) {
        this.snapshot = snapshot;
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
        if (!snapshot.isInitialized() || snapshot.recognizes(normalizedQuery)) {
            return;
        }
        log.info("event=search_keyword_unresolved keyword=\"{}\"", quoted(normalizedQuery));
    }

    private static String quoted(String normalizedQuery) {
        return normalizedQuery.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    public List<RankedKeyword> rankings() {
        if (!snapshot.isInitialized()) {
            throw new InfrastructureException("검색어 사전을 불러오지 못했습니다.");
        }
        return snapshot.rankings();
    }

}
