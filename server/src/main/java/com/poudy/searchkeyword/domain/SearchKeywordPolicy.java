package com.poudy.searchkeyword.domain;

public final class SearchKeywordPolicy {
    /** Production default; measurements may construct KeywordBuckets with another divisor of one hour. */
    public static final int BUCKET_SECONDS = 60;
    public static final int RANKING_HOURS = 168;
    public static final int RANKING_REFRESH_SECONDS = 30;
    public static final int MIN_COUNT = 5;
    public static final int RANKING_SIZE = 10;
    public static final int REPORT_MIN_COUNT = 20;
    public static final int SAVE_INTERVAL_SECONDS = 60;

    private SearchKeywordPolicy() {
    }
}
