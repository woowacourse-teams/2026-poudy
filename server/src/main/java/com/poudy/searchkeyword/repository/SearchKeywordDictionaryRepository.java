package com.poudy.searchkeyword.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SearchKeywordDictionaryRepository {

    private static final Logger LOG = LoggerFactory.getLogger(SearchKeywordDictionaryRepository.class);

    private final SearchKeywordJpaRepository searchKeywordJpaRepository;

    public SearchKeywordDictionaryRepository(
        SearchKeywordJpaRepository searchKeywordJpaRepository
    ) {
        this.searchKeywordJpaRepository = searchKeywordJpaRepository;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public SearchKeywordDictionary read() {
        SearchKeywordDictionary dictionary = load();
        logLoaded(dictionary);
        return dictionary;
    }

    private SearchKeywordDictionary load() {
        try {
            return SearchKeywordDictionary.of(searchKeywordJpaRepository.findAllEntries());
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
