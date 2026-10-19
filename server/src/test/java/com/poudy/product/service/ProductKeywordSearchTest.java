package com.poudy.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.product.search.service.ProductSearchService;
import org.junit.jupiter.api.Test;

class ProductKeywordSearchTest {

    @Test
    void delegatesSearchResultCheckToProductSearchService() {
        ProductSearchService products = mock(ProductSearchService.class);
        given(products.hasResults("토너")).willReturn(true);

        ProductKeywordSearch search = new ProductKeywordSearch(products);

        assertThat(search.hasResults("토너")).isTrue();
        assertThat(search.hasResults("없는 검색어")).isFalse();
    }
}
