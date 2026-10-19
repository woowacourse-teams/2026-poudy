package com.poudy.product.service;

import com.poudy.product.search.service.ProductSearchService;
import com.poudy.searchkeyword.service.KeywordSearch;
import org.springframework.stereotype.Component;

@Component
public class ProductKeywordSearch implements KeywordSearch {

    private final ProductSearchService products;

    public ProductKeywordSearch(ProductSearchService products) {
        this.products = products;
    }

    @Override
    public boolean hasResults(String keyword) {
        return products.hasResults(keyword);
    }
}
