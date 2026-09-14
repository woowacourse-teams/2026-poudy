package com.poudy.searchkeyword.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.DictionaryEntry.Status;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class KeywordCoverageTest {

    private final SearchKeywordDictionary dictionary = SearchKeywordDictionary.of(
        "v1",
        List.of(
            DictionaryEntry.of("term:1", "토너", Status.ACTIVE, true, List.of("토너"))
        ),
        keyword -> true
    );

    @Test
    void countsTheShareOfSearchesThatTheDictionaryResolves() {
        KeywordCoverage coverage = KeywordCoverage.of(Map.of("토너", 3L, "미등록", 1L), dictionary);

        assertThat(coverage.total()).isEqualTo(4);
        assertThat(coverage.resolved()).isEqualTo(3);
        assertThat(coverage.distinctKeys()).isEqualTo(2);
        assertThat(coverage.ratio()).isEqualTo(0.75);
    }

    @Test
    void countsSpacingVariantsAsResolvedAndTreatsEmptyCountsAsZero() {
        assertThat(KeywordCoverage.of(Map.of("토 너", 2L), dictionary).resolved()).isEqualTo(2);
        assertThat(KeywordCoverage.of(Map.of(), dictionary).ratio()).isZero();
    }
}
