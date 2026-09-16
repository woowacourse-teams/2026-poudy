package com.poudy.searchkeyword.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.DictionaryEntry.Status;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class SearchKeywordDictionaryTest {

    @Test
    void resolvesOnlyProvidedWholeExpressionsWithoutFuzzyOrImplicitKeywordExpansion() {
        DictionaryEntry product = entry("product:1", "라운드랩 1025 독도 토너", Status.ACTIVE, true, "독도토너");
        SearchKeywordDictionary dictionary = dictionary(List.of(product), keyword -> true);

        assertThat(dictionary.resolve("독도토너")).contains(product);
        assertThat(dictionary.resolve("독도")).isEmpty();
        assertThat(dictionary.resolve("ㄷㄷㅌㄴ")).isEmpty();
        assertThat(dictionary.resolve("라운드랩1025독도토너")).isEmpty();
    }

    @Test
    void resolvesSpacingVariantsThroughTheSameExpressionKey() {
        DictionaryEntry product = entry("product:1", "라운드랩 1025 독도 토너", Status.ACTIVE, true, "독도토너");
        SearchKeywordDictionary dictionary = dictionary(List.of(product), keyword -> true);

        assertThat(dictionary.resolve("독도 토너")).contains(product);
        assertThat(dictionary.resolve("독도토너")).contains(product);
        assertThat(dictionary.recognizes("독도 토너")).isTrue();
        assertThat(dictionary.resolve("독도 토")).isEmpty();
    }

    @Test
    void mergesNormalizedDuplicatesWithinEntryButRejectsActiveConflicts() {
        DictionaryEntry term = DictionaryEntry.of("term:1", "PDRN", Status.ACTIVE, true, List.of("PDRN", " pdrn "));
        assertThat(dictionary(List.of(term), keyword -> true).expressionCount()).isEqualTo(1);
        DictionaryEntry conflict = entry("term:2", "다른 항목", Status.ACTIVE, true, "pdrn");
        assertThatThrownBy(() -> dictionary(List.of(term, conflict), keyword -> true))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void inactiveConflictDoesNotClaimAnExpressionAndEligibilityNeverRemovesResolution() {
        DictionaryEntry active = entry("term:1", "PDRN", Status.ACTIVE, false, "pdrn");
        DictionaryEntry inactive = entry("term:2", "다른 항목", Status.INACTIVE, true, "pdrn");
        SearchKeywordDictionary dictionary = dictionary(List.of(active, inactive), keyword -> true);

        assertThat(dictionary.resolve("pdrn")).contains(active);
        assertThat(dictionary.canRank(active)).isFalse();
        assertThat(dictionary.canRank(inactive)).isFalse();
    }

    @Test
    void keepsZeroResultEntryResolvableAndValidatesOnlyWhenRankingRefreshes() {
        List<String> searches = new ArrayList<>();
        DictionaryEntry product = entry("product:1", "사라진 상품", Status.ACTIVE, true, "상품");
        SearchKeywordDictionary dictionary = dictionary(List.of(product), keyword -> {
            searches.add(keyword);
            return false;
        });
        for (int index = 0; index < 10; index++) {
            assertThat(dictionary.resolve("상품")).contains(product);
        }
        assertThat(searches).isEmpty();
        assertThat(dictionary.canRank(product)).isFalse();
        assertThat(searches).containsExactly("사라진 상품");
    }

    @Test
    void largeDictionaryConstructionDoesNotQueryCatalog() {
        AtomicInteger calls = new AtomicInteger();
        List<DictionaryEntry> entries = java.util.stream.IntStream.range(0, 10_000)
            .mapToObj(i -> entry("term:" + i, "검색어" + i, Status.ACTIVE, true, "표현" + i)).toList();
        SearchKeywordDictionary dictionary = dictionary(entries, keyword -> {
            calls.incrementAndGet();
            return true;
        });
        assertThat(dictionary.expressionCount()).isEqualTo(10_000);
        assertThat(calls).hasValue(0);
    }

    @Test
    void cachesTrueAndFalseResultsButRetriesAfterException() {
        AtomicInteger calls = new AtomicInteger();
        SearchKeywordDictionary dictionary = dictionary(
            List.of(entry("term", "토너", Status.ACTIVE, true, "토너")),
            keyword -> {
                if (calls.incrementAndGet() == 1) {
                    throw new IllegalStateException("transient");
                }
                return false;
            }
        );
        assertThatThrownBy(() -> dictionary.canRank(dictionary.resolve("토너").orElseThrow()))
            .isInstanceOf(IllegalStateException.class);
        DictionaryEntry entry = dictionary.resolve("토너").orElseThrow();
        assertThat(dictionary.canRank(entry)).isFalse();
        assertThat(dictionary.canRank(entry)).isFalse();
        assertThat(calls).hasValue(2);
    }

    @Test
    void brandProductAndTermAreAllPublishableWithSeparateIdentities() {
        DictionaryEntry brand = entry("brand:1", "라운드랩", Status.ACTIVE, true, "라운드랩");
        DictionaryEntry product = entry("product:1", "라운드랩 토너", Status.ACTIVE, true, "독도토너");
        DictionaryEntry term = entry("term:1", "토너", Status.ACTIVE, true, "토너");
        SearchKeywordDictionary dictionary = dictionary(List.of(brand, product, term), keyword -> true);

        assertThat(List.of(brand, product, term)).allMatch(dictionary::canRank);
        assertThat(dictionary.resolve("독도토너")).contains(product);
        assertThat(dictionary.resolve("토너")).contains(term);
    }

    @Test
    void replacementDictionaryReinterpretsExistingNormalizedInput() {
        DictionaryEntry before = entry("old-id", "이전 이름", Status.ACTIVE, true, "별칭");
        DictionaryEntry after = entry("new-id", "변경 이름", Status.ACTIVE, true, "별칭");
        assertThat(dictionary(List.of(before), keyword -> true).resolve("별칭")).contains(before);
        assertThat(dictionary(List.of(after), keyword -> true).resolve("별칭")).contains(after);
        assertThat(dictionary(List.of(), keyword -> true).resolve("별칭")).isEmpty();
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

    private SearchKeywordDictionary dictionary(List<DictionaryEntry> entries, KeywordSearch search) {
        return SearchKeywordDictionary.of("fixture-v1", entries, search);
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
