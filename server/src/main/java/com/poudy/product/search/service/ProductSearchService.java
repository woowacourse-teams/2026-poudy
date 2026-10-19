package com.poudy.product.search.service;

import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestions;
import com.poudy.product.search.domain.analysis.ProductSearchAnalyzer;
import com.poudy.product.search.domain.query.AnalyzedProductQuery;
import com.poudy.product.search.repository.ProductSearchRepository;
import com.poudy.product.search.repository.ProductSearchResult;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ProductSearchService {
    private final ProductSearchAnalyzer analyzer = new ProductSearchAnalyzer();
    private final ProductSearchRepository repository;

    public ProductSearchService(ProductSearchRepository repository) {
        this.repository = repository;
    }

    public ProductPage find(ProductQuery query, ProductSort sort, int page, int size) {
        if (!query.hasKeyword()) {
            return repository.find(query, null, sort, page, size).value();
        }
        return search(query.keyword(), analyzed -> repository.find(query, analyzed, sort, page, size));
    }

    public long count(ProductQuery query) {
        if (!query.hasKeyword()) {
            return repository.count(query, null).value();
        }
        return search(query.keyword(), analyzed -> repository.count(query, analyzed));
    }

    public ProductSuggestions suggest(String keyword, int page, int size) {
        return search(keyword, analyzed -> repository.suggest(analyzed, page, size));
    }

    public boolean hasResults(String keyword) {
        return search(keyword, repository::hasResults);
    }

    public boolean hasConflictingIngredients(ProductQuery query) {
        return repository.hasConflictingIngredients(query);
    }

    private <T> T search(String raw, Function<AnalyzedProductQuery, ProductSearchResult<T>> execute) {
        AnalyzedProductQuery query = analyzer.analyzeQuery(raw);
        ProductSearchResult<T> original = execute.apply(query);
        if (original.hasFullMatch()) {
            return original.value();
        }
        String correctedText = repository.correctQuery(query.correctionText());
        if (correctedText == null) {
            return original.value();
        }
        AnalyzedProductQuery corrected = analyzer.analyzeQuery(correctedText);
        if (query.hasSameText(corrected)) {
            return original.value();
        }
        ProductSearchResult<T> replacement = execute.apply(corrected);
        if (replacement.searchTotal() > 0) {
            return replacement.value();
        }
        return original.value();
    }
}
