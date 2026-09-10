package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.List;

public final class ReportSection {

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
