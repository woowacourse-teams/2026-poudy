package com.poudy.searchkeyword.domain;

public final class ReportItem {

    private final String normalizedQuery;
    private final long count;

    public ReportItem(String normalizedQuery, long count) {
        this.normalizedQuery = normalizedQuery;
        this.count = count;
    }

    public String normalizedQuery() {
        return normalizedQuery;
    }

    public long count() {
        return count;
    }
}
