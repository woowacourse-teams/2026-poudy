package com.poudy.searchkeyword.domain;

import java.util.List;

public final class SearchKeywordPolicy {
    public static final List<String> DEFAULT_KEYWORDS = List.of(
        "토너",
        "선크림",
        "크림",
        "로션",
        "클렌징",
        "선스틱",
        "패드",
        "패치",
        "앰플",
        "에센스"
    );
    public static final int BUCKET_SECONDS = 600;
    public static final String REFRESH_CRON = "0 */" + BUCKET_SECONDS / 60 + " * * * *";
    public static final int RANKING_HOURS = 168;
    public static final int COMPARISON_BUCKETS = 1;
    public static final int MIN_COUNT = 5;
    public static final int RANKING_SIZE = 10;

    private SearchKeywordPolicy() {
    }
}
