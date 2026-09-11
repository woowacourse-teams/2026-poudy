package com.poudy.searchkeyword.domain;

import java.time.Duration;
import java.time.Instant;

public final class BucketWindow {

    private static final int SECONDS_PER_HOUR = 3600;

    private final int bucketSeconds;
    private final int windowBuckets;

    public BucketWindow(int windowHours, int bucketSeconds) {
        if (windowHours < 1) {
            throw new IllegalArgumentException("Window must be positive");
        }
        if (bucketSeconds < 1 || SECONDS_PER_HOUR % bucketSeconds != 0) {
            throw new IllegalArgumentException("Bucket duration must divide one hour");
        }
        this.bucketSeconds = bucketSeconds;
        this.windowBuckets = Math.multiplyExact(windowHours, SECONDS_PER_HOUR / bucketSeconds);
    }

    public int bucketSeconds() {
        return bucketSeconds;
    }

    public boolean canRetain(int bucketCount) {
        return bucketCount <= Math.addExact(windowBuckets, 1);
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

    public boolean covers(Instant latestStart, Instant start) {
        return !start.isBefore(oldestStart(latestStart)) && !start.isAfter(latestStart);
    }

    public Duration untilNextStart(Instant now) {
        return Duration.between(now, startOf(now).plusSeconds(bucketSeconds));
    }
}
