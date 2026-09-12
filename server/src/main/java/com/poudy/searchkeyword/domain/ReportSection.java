package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
        Map<String, List<Map.Entry<String, Long>>> variants = view.counts().entrySet().stream()
            .filter(entry -> !dictionary.recognizes(entry.getKey()))
            .collect(Collectors.groupingBy(entry -> SearchKeyword.folded(entry.getKey())));
        List<ReportItem> items = variants.values().stream()
            .map(ReportSection::merged)
            .filter(item -> item.count() >= minCount)
            .sorted(
                Comparator.comparingLong(ReportItem::count).reversed()
                    .thenComparing(ReportItem::normalizedQuery)
            )
            .limit(MAX_ITEMS)
            .toList();
        return new ReportSection(
            view.windowStart(),
            view.observedThrough(),
            view.startedAt(),
            view.clockRegressed(),
            items
        );
    }

    private static ReportItem merged(List<Map.Entry<String, Long>> variants) {
        long count = variants.stream().mapToLong(Map.Entry::getValue).reduce(0L, Math::addExact);
        String mostTyped = variants.stream()
            .min(
                Comparator.comparingLong((Map.Entry<String, Long> variant) -> -variant.getValue())
                    .thenComparing(Map.Entry::getKey)
            )
            .map(Map.Entry::getKey)
            .orElseThrow();
        return new ReportItem(mostTyped, count);
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
