package com.poudy.product.search.indexing;

import com.poudy.product.search.domain.analysis.ProductSearchAnalyzer;
import com.poudy.product.search.domain.name.AnalyzedProductName;
import com.poudy.product.search.domain.text.IndexedSearchText;
import java.util.ArrayList;
import java.util.List;

public final class ProductSearchIndexRows {
    private final ProductSearchAnalyzer analyzer = new ProductSearchAnalyzer();

    public List<ProductSearchNameRow> analyze(long productId, String field, String source) {
        if (source == null) {
            return List.of();
        }
        AnalyzedProductName name = analyzer.analyzeName(source);
        List<ProductSearchNameRow> rows = new ArrayList<>();
        rows.add(row(productId, field, "DIRECT", name, name.direct()));
        if (name.hasReading()) {
            rows.add(row(productId, field, "READING", name, name.reading()));
        }
        if (!field.equals("BRAND_ENGLISH_NAME")) {
            rows.add(row(productId, field, "INITIALS", name, name.initials()));
            if (name.hasReading()) {
                rows.add(row(productId, field, "READING_INITIALS", name, name.readingInitials()));
            }
        }
        return List.copyOf(rows);
    }

    private ProductSearchNameRow row(
        long id,
        String field,
        String kind,
        AnalyzedProductName name,
        IndexedSearchText text
    ) {
        return new ProductSearchNameRow(
            id,
            field,
            kind,
            ProductSearchAnalyzer.VERSION,
            name.source(),
            name.normalized(),
            text.text(),
            text.sourceStarts(),
            text.sourceEnds()
        );
    }
}
