package com.poudy.searchkeyword.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("검색어 사전 저장소")
class SearchKeywordDictionaryRepositoryTest {

    @Autowired
    private SearchKeywordDictionaryRepository repository;

    @Test
    @DisplayName("DB의 대표어와 표현을 사전으로 읽는다")
    void readsKeywordsAndExpressions() {
        SearchKeywordDictionary dictionary = repository.read(keyword -> true);

        assertThat(dictionary.activeEntryCount()).isEqualTo(3);
        assertThat(dictionary.expressionCount()).isEqualTo(4);
        assertThat(dictionary.resolve("독도토너")).hasValueSatisfying(entry -> {
            assertThat(entry.keyword()).isEqualTo("라운드랩 1025 독도 토너");
            assertThat(dictionary.canRank(entry)).isTrue();
        });
        assertThat(dictionary.resolve("pdrn"))
            .hasValueSatisfying(entry -> assertThat(dictionary.canRank(entry)).isTrue());
    }
}
