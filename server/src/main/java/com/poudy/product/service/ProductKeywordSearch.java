package com.poudy.product.service;

import com.poudy.product.repository.ProductRepository;
import com.poudy.searchkeyword.service.KeywordSearch;
import org.springframework.stereotype.Component;

@Component
public class ProductKeywordSearch implements KeywordSearch {

    private final ProductRepository products;

    public ProductKeywordSearch(ProductRepository products) {
        this.products = products;
    }

    @Override
    public boolean hasResults(String keyword) {
        return products.hasSearchResults(keyword);
    }
}
