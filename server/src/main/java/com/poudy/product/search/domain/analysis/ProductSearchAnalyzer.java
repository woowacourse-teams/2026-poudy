package com.poudy.product.search.domain.analysis;

import com.poudy.product.search.domain.analysis.hangul.HangulComposer;
import com.poudy.product.search.domain.analysis.hangul.JamoEncoder;
import com.poudy.product.search.domain.analysis.reading.LatinReading;
import com.poudy.product.search.domain.name.AnalyzedProductName;
import com.poudy.product.search.domain.query.AnalyzedProductQuery;
import com.poudy.product.search.domain.query.BrandProductSplit;
import com.poudy.product.search.domain.query.SearchToken;
import com.poudy.product.search.domain.text.IndexedSearchText;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public final class ProductSearchAnalyzer {
    public static final int VERSION = 1;
    private static final Pattern SPACES = Pattern.compile("[\\p{Z}\\s\\u0085]+");
    private final HangulComposer composer = new HangulComposer();
    private final JamoEncoder encoder = new JamoEncoder();
    private final LatinReading reading = new LatinReading();

    public AnalyzedProductQuery analyzeQuery(String raw) {
        SearchToken whole = token(raw);
        Map<String, SearchToken> tokens = new LinkedHashMap<>();
        for (String part : SPACES.split(raw)) {
            SearchToken token = token(part);
            if (!token.isEmpty()) {
                tokens.putIfAbsent(token.normalized(), token);
            }
        }
        List<BrandProductSplit> splits = new ArrayList<>();
        if (tokens.size() == 1) {
            String normalized = whole.normalized();
            for (int i = 1; i < normalized.length(); i++) {
                SearchToken head = token(normalized.substring(0, i));
                SearchToken tail = token(normalized.substring(i));
                splits.add(new BrandProductSplit(head, tail));
                splits.add(new BrandProductSplit(tail, head));
            }
        }
        return new AnalyzedProductQuery(whole, List.copyOf(tokens.values()), splits);
    }

    public AnalyzedProductName analyzeName(String raw) {
        IndexedSearchText normalized = composer.compose(raw);
        IndexedSearchText read = reading.name(normalized);
        return new AnalyzedProductName(
            raw,
            normalized.text(),
            encoder.encode(normalized),
            encoder.encode(read),
            encoder.initials(normalized),
            encoder.initials(read)
        );
    }

    private SearchToken token(String raw) {
        IndexedSearchText normalized = composer.compose(raw);
        return new SearchToken(
            normalized.text(),
            encoder.encode(normalized).text(),
            encoder.encode(reading.query(normalized)).text()
        );
    }
}
