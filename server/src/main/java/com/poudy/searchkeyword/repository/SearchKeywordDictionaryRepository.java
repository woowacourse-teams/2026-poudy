package com.poudy.searchkeyword.repository;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.KeywordSearch;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class SearchKeywordDictionaryRepository {

    private static final Logger LOG = LoggerFactory.getLogger(SearchKeywordDictionaryRepository.class);

    private final SearchKeywordJpaRepository searchKeywordJpaRepository;
    private final SnapshotReader snapshotReader;

    public SearchKeywordDictionaryRepository(
        SearchKeywordJpaRepository searchKeywordJpaRepository,
        SnapshotReader snapshotReader
    ) {
        this.searchKeywordJpaRepository = searchKeywordJpaRepository;
        this.snapshotReader = snapshotReader;
    }

    public SearchKeywordDictionary read(KeywordSearch search) {
        SearchKeywordDictionary dictionary = snapshotReader.read(() -> load(search));
        logLoaded(dictionary);
        return dictionary;
    }

    private SearchKeywordDictionary load(KeywordSearch search) {
        try {
            return SearchKeywordDictionary.of(searchKeywordJpaRepository.findAllEntries(), search);
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("검색어 사전 데이터가 올바르지 않습니다.", exception);
        }
    }

    private static void logLoaded(SearchKeywordDictionary dictionary) {
        LOG.info(
            "Search keyword dictionary loaded: activeEntries={}, expressionKeys={}, emptyEntries={}",
            dictionary.activeEntryCount(),
            dictionary.expressionCount(),
            dictionary.emptyActiveEntryCount()
        );
        dictionary.emptyActiveEntryIds().forEach(
            id -> LOG
                .warn("Active search keyword has no expressions: id={}", id)
        );
    }
}
