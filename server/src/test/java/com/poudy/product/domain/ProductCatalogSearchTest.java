package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.repository.ProductQueryRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CatalogKeywordSearchTest {
    @Autowired
    private ProductQueryRepository repository;
    @Autowired
    private com.poudy.searchkeyword.service.KeywordSearch search;

    @ParameterizedTest
    @ValueSource(strings = {"다 브랜드 블랙 스네일 토너", "가 브랜드 블랙 스네일 토너", "다 브랜드", "토너", "ㅌㄴ", "toner", "없는상품"})
    void usesSameSearchCandidatesAsProductList(String keyword) {
        ProductQuery query = new ProductQuery(keyword, null, null, null, null, null, null, null, null);
        assertThat(search.hasResults(keyword)).isEqualTo(repository.count(query) > 0);
    }
}
