package com.poudy.searchkeyword.domain.bucket;

import java.time.Instant;

public final class BucketWindow {

    private static final int SECONDS_PER_HOUR = 3600;

    private final int bucketSeconds;
    private final int windowBuckets;
    private final int comparisonBuckets;

    public BucketWindow(int windowHours, int bucketSeconds, int comparisonBuckets) {
        if (windowHours < 1) {
            throw new IllegalArgumentException("Window must be positive");
        }
        if (bucketSeconds < 1 || SECONDS_PER_HOUR % bucketSeconds != 0) {
            throw new IllegalArgumentException("Bucket duration must divide one hour");
        }
        if (comparisonBuckets < 0) {
            throw new IllegalArgumentException("Comparison offset cannot be negative");
        }
        this.bucketSeconds = bucketSeconds;
        this.windowBuckets = Math.multiplyExact(windowHours, SECONDS_PER_HOUR / bucketSeconds);
        this.comparisonBuckets = comparisonBuckets;
    }

    public Instant startOf(Instant instant) {
        long startSecond = Math.floorDiv(instant.getEpochSecond(), bucketSeconds) * bucketSeconds;
        return Instant.ofEpochSecond(startSecond);
    }

    public Instant oldestStart(Instant latestStart) {
        return latestStart.minusSeconds((long) windowBuckets * bucketSeconds);
    }

    public Instant retainedStart(Instant latestStart) {
        return oldestStart(latestStart).minusSeconds((long) comparisonBuckets * bucketSeconds);
    }

    public Instant comparisonLatestStart(Instant latestStart) {
        return latestStart.minusSeconds((long) comparisonBuckets * bucketSeconds);
    }

    public boolean comparesWithPast() {
        return comparisonBuckets > 0;
    }
}
