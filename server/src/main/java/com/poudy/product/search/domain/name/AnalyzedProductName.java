package com.poudy.product.search.domain.name;

import com.poudy.product.search.domain.text.IndexedSearchText;

public final class AnalyzedProductName {
    private final String source;
    private final String normalized;
    private final IndexedSearchText direct;
    private final IndexedSearchText reading;
    private final IndexedSearchText initials;
    private final IndexedSearchText readingInitials;

    public AnalyzedProductName(
        String source,
        String normalized,
        IndexedSearchText direct,
        IndexedSearchText reading,
        IndexedSearchText initials,
        IndexedSearchText readingInitials
    ) {
        this.source = source;
        this.normalized = normalized;
        this.direct = direct;
        this.reading = reading;
        this.initials = initials;
        this.readingInitials = readingInitials;
    }

    public String source() {
        return source;
    }

    public String normalized() {
        return normalized;
    }

    public IndexedSearchText direct() {
        return direct;
    }

    public IndexedSearchText reading() {
        return reading;
    }

    public IndexedSearchText initials() {
        return initials;
    }

    public IndexedSearchText readingInitials() {
        return readingInitials;
    }

    public boolean hasReading() {
        return !direct.text().equals(reading.text());
    }
}
