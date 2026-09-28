package com.poudy.searchkeyword.domain.dictionary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry.Status;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class SearchKeywordDictionaryTest {

    @Test
    void resolvesOnlyProvidedWholeExpressionsWithoutFuzzyOrImplicitKeywordExpansion() {
        DictionaryEntry product = entry("product:1", "라운드랩 1025 독도 토너", Status.ACTIVE, true, "독도토너");
        SearchKeywordDictionary dictionary = dictionary(List.of(product));

        assertThat(dictionary.resolve("독도토너")).contains(product);
        assertThat(dictionary.resolve("독도")).isEmpty();
        assertThat(dictionary.resolve("ㄷㄷㅌㄴ")).isEmpty();
        assertThat(dictionary.resolve("라운드랩1025독도토너")).isEmpty();
    }

    @Test
    void resolvesSpacingVariantsThroughTheSameExpressionKey() {
        DictionaryEntry product = entry("product:1", "라운드랩 1025 독도 토너", Status.ACTIVE, true, "독도토너");
        SearchKeywordDictionary dictionary = dictionary(List.of(product));

        assertThat(dictionary.resolve("독도 토너")).contains(product);
        assertThat(dictionary.resolve("독도토너")).contains(product);
        assertThat(dictionary.recognizes("독도 토너")).isTrue();
        assertThat(dictionary.resolve("독도 토")).isEmpty();
    }

    @Test
    void mergesNormalizedDuplicatesWithinEntryButRejectsActiveConflicts() {
        DictionaryEntry term = DictionaryEntry.of("term:1", "PDRN", Status.ACTIVE, true, List.of("PDRN", " pdrn "));
        assertThat(dictionary(List.of(term)).expressionCount()).isEqualTo(1);
        DictionaryEntry conflict = entry("term:2", "다른 항목", Status.ACTIVE, true, "pdrn");
        assertThatThrownBy(() -> dictionary(List.of(term, conflict)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void inactiveConflictDoesNotClaimAnExpressionAndEligibilityNeverRemovesResolution() {
        DictionaryEntry active = entry("term:1", "PDRN", Status.ACTIVE, false, "pdrn");
        DictionaryEntry inactive = entry("term:2", "다른 항목", Status.INACTIVE, true, "pdrn");
        SearchKeywordDictionary dictionary = dictionary(List.of(active, inactive));

        assertThat(dictionary.resolve("pdrn")).contains(active);
        assertThat(active.isRankable()).isFalse();
        assertThat(inactive.isRankable()).isFalse();
    }

    @Test
    void brandProductAndTermAreAllPublishableWithSeparateIdentities() {
        DictionaryEntry brand = entry("brand:1", "라운드랩", Status.ACTIVE, true, "라운드랩");
        DictionaryEntry product = entry("product:1", "라운드랩 토너", Status.ACTIVE, true, "독도토너");
        DictionaryEntry term = entry("term:1", "토너", Status.ACTIVE, true, "토너");
        SearchKeywordDictionary dictionary = dictionary(List.of(brand, product, term));

        assertThat(List.of(brand, product, term)).allMatch(DictionaryEntry::isRankable);
        assertThat(dictionary.resolve("독도토너")).contains(product);
        assertThat(dictionary.resolve("토너")).contains(term);
    }

    @Test
    void replacementDictionaryReinterpretsExistingNormalizedInput() {
        DictionaryEntry before = entry("old-id", "이전 이름", Status.ACTIVE, true, "별칭");
        DictionaryEntry after = entry("new-id", "변경 이름", Status.ACTIVE, true, "별칭");
        assertThat(dictionary(List.of(before)).resolve("별칭")).contains(before);
        assertThat(dictionary(List.of(after)).resolve("별칭")).contains(after);
        assertThat(dictionary(List.of()).resolve("별칭")).isEmpty();
    }

    @Test
    void validatesNormalizationAgainstExplicitUnicodeFixtures() throws IOException {
        try (InputStream source = getClass().getResourceAsStream("/searchkeyword/normalization.json")) {
            for (JsonNode fixture : JsonMapper.builder().build().readTree(source)) {
                assertThat(new SearchKeyword(fixture.get(1).asString()).value())
                    .as(fixture.get(0).asString()).isEqualTo(fixture.get(2).asString());
            }
        }
    }

    private SearchKeywordDictionary dictionary(List<DictionaryEntry> entries) {
        return SearchKeywordDictionary.of(entries);
    }

    private DictionaryEntry entry(
        String id,
        String keyword,
        Status status,
        boolean eligible,
        String expression
    ) {
        return DictionaryEntry.of(id, keyword, status, eligible, List.of(expression));
    }
}
