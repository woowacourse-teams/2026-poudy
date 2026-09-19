package com.poudy.searchkeyword.domain;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

public final class KeywordBuckets {

    private final Clock clock;
    private final BucketWindow window;
    private final KeywordCountStore store;
    private final Instant startedAt;

    public KeywordBuckets(Clock clock, BucketWindow window, KeywordCountStore store) {
        this.clock = clock;
        this.window = window;
        this.store = store;
        this.startedAt = clock.instant();
    }

    public void record(String normalizedQuery) {
        KeywordKeys.requireNormalized(normalizedQuery);
        store.increase(currentBucketStart(), normalizedQuery);
    }

    public KeywordBucketView view() {
        Instant latestStart = currentBucketStart();
        store.removeBefore(window.retainedStart(latestStart));
        return new KeywordBucketView(store.sumBetween(window.oldestStart(latestStart), latestStart));
    }

    public Optional<KeywordBucketView> comparisonView() {
        if (!window.comparesWithPast()) {
            return Optional.empty();
        }
        Instant comparedStart = window.comparisonLatestStart(currentBucketStart());
        if (!observedFrom().isBefore(comparedStart)) {
            return Optional.empty();
        }
        return Optional.of(new KeywordBucketView(store.sumBetween(window.oldestStart(comparedStart), comparedStart)));
    }

    public Instant currentBucketStart() {
        return window.startOf(clock.instant());
    }

    public Duration untilBucketAfter(Instant bucketStart) {
        return Duration.between(clock.instant(), window.nextStart(bucketStart));
    }

    private Instant observedFrom() {
        Instant started = window.startOf(startedAt);
        return store.earliestBucketStart().filter(earliest -> earliest.isBefore(started)).orElse(started);
    }
}
