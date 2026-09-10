package com.poudy.searchkeyword.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.DefaultResourceLoader;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class SearchKeywordDictionaryRepositoryTest {

    private final SearchKeywordDictionaryRepository repository = new SearchKeywordDictionaryRepository();
    private final JsonMapper mapper = JsonMapper.builder().build();

    @TempDir
    Path directory;

    @Test
    void readsWholeDocumentAndLeavesSourceUnchanged() throws IOException {
        byte[] bytes = fixture().getBytes(StandardCharsets.UTF_8);
        Path file = directory.resolve("search_keywords.json");
        Files.write(file, bytes);

        SearchKeywordDictionary dictionary = repository.read(file, keyword -> true);

        assertThat(dictionary.version()).isEqualTo("fixture-v1");
        assertThat(dictionary.activeEntryCount()).isEqualTo(3);
        assertThat(dictionary.expressionCount()).isEqualTo(4);
        assertThat(dictionary.resolve("독도토너")).hasValueSatisfying(entry -> {
            assertThat(entry.keyword()).isEqualTo("라운드랩 1025 독도 토너");
            assertThat(dictionary.validateForRanking(entry)).isTrue();
        });
        assertThat(dictionary.resolve("pdrn"))
            .hasValueSatisfying(entry -> assertThat(dictionary.validateForRanking(entry)).isTrue());
        assertThat(Files.readAllBytes(file)).isEqualTo(bytes);
    }

    @ParameterizedTest
    @ValueSource(strings = {"schema_version", "normalizer_version", "dictionary_version", "search_keywords"})
    void rejectsMissingAndNullDocumentFields(String field) throws IOException {
        ObjectNode document = document();
        document.remove(field);
        assertRejected(document.toString());
        document = document();
        document.putNull(field);
        assertRejected(document.toString());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "id",
            "kind",
            "keyword",
            "expressions",
            "expression_types",
            "status",
            "ranking_eligible",
            "catalog_refs"})
    void rejectsMissingAndNullEntryFields(String field) throws IOException {
        ObjectNode document = document();
        entry(document).remove(field);
        assertRejected(document.toString());
        document = document();
        entry(document).putNull(field);
        assertRejected(document.toString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"kind", "status"})
    void rejectsUnknownEnumsAndNumericEnums(String field) throws IOException {
        ObjectNode document = document();
        entry(document).put(field, "UNKNOWN");
        assertRejected(document.toString());
        entry(document).put(field, 0);
        assertRejected(document.toString());
    }

    @Test
    void rejectsUnknownFieldsAtEveryObjectLevel() throws IOException {
        ObjectNode document = document();
        document.put("typo", true);
        assertRejected(document.toString());
        document = document();
        entry(document).put("typo", true);
        assertRejected(document.toString());
        document = document();
        ((ObjectNode) entry(document).get("catalog_refs").get(0)).put("typo", true);
        assertRejected(document.toString());
    }

    @Test
    void rejectsUnknownEntryFieldWhileSharedCatalogReaderRemainsPermissive() throws IOException {
        ObjectNode document = document();
        entry(document).put("typo", true);
        Files.writeString(directory.resolve("search_keywords.json"), document.toString());

        assertRejected(document.toString());
        JsonDataReader shared = new JsonDataReader(new DefaultResourceLoader(), directory.toString());
        assertThat(shared.readList("search_keywords.json", LegacyEntry.class)).hasSize(3);
    }

    private record LegacyEntry(String id) {
    }

    @Test
    void rejectsDuplicateJsonKeysAndTrailingDocument() throws IOException {
        assertRejected(fixture().replace("\"schema_version\": 3", "\"schema_version\": 3, \"schema_version\": 3"));
        assertRejected(
            fixture().replace(
                "\"라운드랩\": \"CATALOG\"",
                "\"라운드랩\": \"CATALOG\", \"라운드랩\": \"CATALOG\""
            )
        );
        assertRejected(fixture() + "{}");
    }

    @Test
    void rejectsUnsupportedVersionsAndScalarCoercion() throws IOException {
        assertRejected(fixture().replace("\"schema_version\": 3", "\"schema_version\": 2"));
        assertRejected(fixture().replace("search-keyword-v1", "search-keyword-v2"));
        assertRejected(fixture().replace("\"schema_version\": 3", "\"schema_version\": \"3\""));
        assertRejected(fixture().replace("\"ranking_eligible\": true", "\"ranking_eligible\": \"true\""));
    }

    @Test
    void rejectsInvalidExpressionSourcesAndNestedNulls() throws IOException {
        assertRejected(fixture().replace("\"CATALOG\"", "\"UNREVIEWED\""));
        assertRejected(fixture().replace("\"CATALOG\"", "null"));
        assertRejected(fixture().replace("\"라운드랩\": \"CATALOG\"", "\" 라운드랩\": \"CATALOG\""));
        ObjectNode document = document();
        entry(document).putArray("expressions").addNull();
        assertRejected(document.toString());
        document = document();
        entry(document).putArray("catalog_refs").addNull();
        assertRejected(document.toString());
    }

    @Test
    void rejectsMissingOrExtraNormalizedKeysAndDuplicateIds() throws IOException {
        ObjectNode document = document();
        entry(document).putObject("expression_types");
        assertRejected(document.toString());
        document = document();
        ((ObjectNode) entry(document).get("expression_types")).put("extra", "CATALOG");
        assertRejected(document.toString());
        document = document();
        ((ObjectNode) document.get("search_keywords").get(1)).put("id", "brand:1");
        assertRejected(document.toString());
    }

    @Test
    void rejectsMissingAndCorruptFilesWithoutChangingThem() throws IOException {
        Path file = directory.resolve("search_keywords.json");
        assertThatThrownBy(() -> repository.read(file, keyword -> true)).isInstanceOf(InfrastructureException.class);
        Files.writeString(file, "broken");
        assertThatThrownBy(() -> repository.read(file, keyword -> true)).isInstanceOf(InfrastructureException.class);
        assertThat(Files.readString(file)).isEqualTo("broken");
    }

    @Test
    void acceptsMultipleOrEmptyReferencesAndEmptyActiveExpressions() throws IOException {
        ObjectNode document = document();
        entry(document).putArray("expressions");
        entry(document).putObject("expression_types");

        SearchKeywordDictionary dictionary = read(document.toString());

        assertThat(dictionary.emptyActiveEntryIds()).containsExactly("brand:1");
        assertThat(dictionary.resolve("라운드랩")).isEmpty();
        assertThat(dictionary.activeEntryCount()).isEqualTo(3);
    }

    @Test
    void rejectsInvalidCatalogReferences() throws IOException {
        for (String invalid : List.of(
            "{\"type\":\"UNKNOWN\",\"id\":1}",
            "{\"type\":\"BRAND\"}",
            "{\"type\":null,\"id\":1}",
            "{\"type\":\"BRAND\",\"id\":0}",
            "{\"type\":\"PRODUCT\",\"id\":1.5}"
        )) {
            ObjectNode document = document();
            entry(document).putArray("catalog_refs").add(mapper.readTree(invalid));
            assertRejected(document.toString());
        }
    }

    private void assertRejected(String json) {
        assertThatThrownBy(() -> read(json)).isInstanceOf(InfrastructureException.class);
    }

    private SearchKeywordDictionary read(String json) {
        return repository.read(new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)), keyword -> true);
    }

    private ObjectNode document() throws IOException {
        return (ObjectNode) mapper.readTree(fixture());
    }

    private ObjectNode entry(JsonNode document) {
        return (ObjectNode) document.get("search_keywords").get(0);
    }

    private String fixture() throws IOException {
        try (var source = getClass().getResourceAsStream("/search_keywords.json")) {
            return new String(source.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
