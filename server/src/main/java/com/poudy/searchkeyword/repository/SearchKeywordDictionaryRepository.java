package com.poudy.searchkeyword.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.DictionaryEntry;
import com.poudy.searchkeyword.domain.DictionaryEntry.ExpressionType;
import com.poudy.searchkeyword.domain.DictionaryEntry.Kind;
import com.poudy.searchkeyword.domain.DictionaryEntry.Status;
import com.poudy.searchkeyword.domain.KeywordSearch;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.cfg.EnumFeature;
import tools.jackson.databind.json.JsonMapper;

public final class SearchKeywordDictionaryRepository {

    private static final Logger LOG = LoggerFactory.getLogger(SearchKeywordDictionaryRepository.class);
    private static final JsonMapper MAPPER = JsonMapper.builder()
        .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
        .enable(DeserializationFeature.FAIL_ON_NULL_CREATOR_PROPERTIES)
        .enable(EnumFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
        .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
        .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
        .build();

    public SearchKeywordDictionary read(Path path, KeywordSearch search) {
        try (InputStream source = Files.newInputStream(path)) {
            return read(source, search);
        } catch (IOException exception) {
            throw new InfrastructureException("검색어 사전 파일을 읽지 못했습니다: " + path, exception);
        }
    }

    public SearchKeywordDictionary read(InputStream source, KeywordSearch search) {
        try {
            DictionaryDocument document = MAPPER.readValue(source, DictionaryDocument.class);
            SearchKeywordDictionary dictionary = document.toDictionary(search);
            LOG.info(
                "Search keyword dictionary loaded: version={}, activeEntries={}, expressionKeys={}, emptyEntries={}",
                dictionary.version(),
                dictionary.activeEntryCount(),
                dictionary.expressionCount(),
                dictionary.emptyActiveEntryIds().size()
            );
            for (String id : dictionary.emptyActiveEntryIds()) {
                LOG.warn(
                    "Active search keyword has no expressions: id={}, dictionaryVersion={}",
                    id,
                    dictionary.version()
                );
            }
            return dictionary;
        } catch (RuntimeException exception) {
            throw new InfrastructureException("검색어 사전 형식 검증에 실패했습니다.", exception);
        }
    }

    private record DictionaryDocument(
        Integer schemaVersion,
        String normalizerVersion,
        String dictionaryVersion,
        List<EntryDocument> searchKeywords) {
        SearchKeywordDictionary toDictionary(KeywordSearch search) {
            if (schemaVersion != 3 || !"search-keyword-v1".equals(normalizerVersion)) {
                throw new IllegalArgumentException("지원하지 않는 검색어 사전 버전입니다.");
            }
            return new SearchKeywordDictionary(
                dictionaryVersion,
                searchKeywords.stream().map(EntryDocument::toEntry).toList(),
                search
            );
        }
    }

    private record EntryDocument(
        String id,
        Kind kind,
        String keyword,
        List<String> expressions,
        Map<String, ExpressionType> expressionTypes,
        Status status,
        Boolean rankingEligible,
        List<CatalogReference> catalogRefs) {
        DictionaryEntry toEntry() {
            catalogRefs.forEach(reference -> Objects.requireNonNull(reference).validate());
            return new DictionaryEntry(id, kind, keyword, status, rankingEligible, expressions, expressionTypes);
        }
    }

    private record CatalogReference(ReferenceType type, Long id) {
        void validate() {
            Objects.requireNonNull(type);
            if (id == null || id <= 0) {
                throw new IllegalArgumentException("사전 카탈로그 참조 ID는 양수여야 합니다.");
            }
        }
    }

    private enum ReferenceType {
        BRAND,
        PRODUCT
    }
}
