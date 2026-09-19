package com.poudy.searchkeyword.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.KeywordSearch;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import java.util.List;
import java.util.Map;
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
        Map<String, List<String>> expressions = searchKeywordJpaRepository.findAllExpressions().stream()
            .collect(
                groupingBy(
                    SearchKeywordExpressionEntity::keywordId,
                    mapping(SearchKeywordExpressionEntity::expressionKey, toList())
                )
            );
        try {
            List<DictionaryEntry> entries = searchKeywordJpaRepository.findAllKeywords().stream()
                .map(keyword -> keyword.toDomain(expressions.getOrDefault(keyword.id(), List.of())))
                .toList();
            return SearchKeywordDictionary.of(entries, search);
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
