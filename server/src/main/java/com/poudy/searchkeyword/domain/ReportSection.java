package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ReportSection {

    private static final int MAX_ITEMS = 100;

    private final Instant windowStart;
    private final Instant observedThrough;
    private final Instant startedAt;
    private final boolean clockRegressed;
    private final List<ReportItem> items;

    public ReportSection(
        Instant windowStart,
        Instant observedThrough,
        Instant startedAt,
        boolean clockRegressed,
        List<ReportItem> items
    ) {
        this.windowStart = windowStart;
        this.observedThrough = observedThrough;
        this.startedAt = startedAt;
        this.clockRegressed = clockRegressed;
        this.items = List.copyOf(items);
    }

    public static ReportSection unresolvedOf(
        KeywordBucketView view,
        SearchKeywordDictionary dictionary,
        long minCount
    ) {
        List<ReportItem> items = view.counts().entrySet().stream()
            .filter(entry -> entry.getValue() >= minCount)
            .filter(entry -> !dictionary.recognizes(entry.getKey()))
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
            .limit(MAX_ITEMS)
            .map(entry -> new ReportItem(entry.getKey(), entry.getValue()))
            .toList();
        return new ReportSection(
            view.windowStart(),
            view.observedThrough(),
            view.startedAt(),
            view.clockRegressed(),
            items
        );
    }

    public Instant windowStart() {
        return windowStart;
    }

    public Instant observedThrough() {
        return observedThrough;
    }

    public Instant startedAt() {
        return startedAt;
    }

    public boolean clockRegressed() {
        return clockRegressed;
    }

    public List<ReportItem> items() {
        return items;
    }

}
