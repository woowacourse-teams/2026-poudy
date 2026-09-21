package com.poudy.config;

import com.poudy.product.repository.ProductRepository;
import com.poudy.searchkeyword.domain.KeywordSearch;

public final class CatalogKeywordSearch implements KeywordSearch {
    private final ProductRepository repository;
    public CatalogKeywordSearch(ProductRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean hasResults(String keyword) {
        return repository.hasSearchResults(keyword);
    }
}
