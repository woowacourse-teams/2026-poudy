package com.poudy.config;

import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import com.poudy.searchkeyword.domain.KeywordSearch;

public final class CatalogKeywordSearch implements KeywordSearch {

    private final Products products;

    public CatalogKeywordSearch(ProductRepository repository) {
        this.products = repository.findAll();
    }

    @Override
    public boolean hasResults(String keyword) {
        return products.hasResults(keyword);
    }
}
