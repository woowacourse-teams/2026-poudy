package com.poudy.searchkeyword.domain;

public final class SearchKeywordPolicy {
    public static final int BUCKET_SECONDS = 600;
    public static final int RANKING_HOURS = 168;
    public static final int COMPARISON_BUCKETS = 1;
    public static final int MIN_COUNT = 5;
    public static final int RANKING_SIZE = 10;

    private SearchKeywordPolicy() {
    }
}
