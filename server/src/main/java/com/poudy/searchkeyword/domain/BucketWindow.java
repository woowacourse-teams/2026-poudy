package com.poudy.searchkeyword.domain;

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

    public int bucketSeconds() {
        return bucketSeconds;
    }

    public boolean hasBucketSeconds(int seconds) {
        return bucketSeconds == seconds;
    }

    public boolean canRetain(int bucketCount) {
        return bucketCount <= Math.addExact(Math.addExact(windowBuckets, comparisonBuckets), 1);
    }

    public Instant startOf(Instant instant) {
        long startSecond = Math.floorDiv(instant.getEpochSecond(), bucketSeconds) * bucketSeconds;
        return Instant.ofEpochSecond(startSecond);
    }

    public boolean isStart(Instant instant) {
        return startOf(instant).equals(instant);
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

    public boolean covers(Instant latestStart, Instant start) {
        return !start.isBefore(retainedStart(latestStart)) && !start.isAfter(latestStart);
    }

    public Instant nextStart(Instant instant) {
        return startOf(instant).plusSeconds(bucketSeconds);
    }
}
