package com.poudy.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.product.repository.ProductRepository;
import org.junit.jupiter.api.Test;

class ProductKeywordSearchTest {

    @Test
    void delegatesSearchResultCheckToProductRepository() {
        ProductRepository products = mock(ProductRepository.class);
        given(products.hasSearchResults("토너")).willReturn(true);

        ProductKeywordSearch search = new ProductKeywordSearch(products);

        assertThat(search.hasResults("토너")).isTrue();
        assertThat(search.hasResults("없는 검색어")).isFalse();
    }
}
