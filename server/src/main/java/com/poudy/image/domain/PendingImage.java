package com.poudy.image.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

public final class PendingImage {

    private static final Duration TTL = Duration.ofHours(24);
    private static final Duration CLEANUP_GRACE_PERIOD = Duration.ofMinutes(10);
    private static final Instant DISCARDED_AT = Instant.EPOCH;

    private final UUID id;
    private final ImagePurpose purpose;

    public PendingImage(UUID id, ImagePurpose purpose) {
        this.id = id;
        this.purpose = purpose;
    }

    public static PendingImage create(ImagePurpose purpose) {
        return new PendingImage(UUID.randomUUID(), purpose);
    }

    public static Instant claimableSince(Instant now) {
        return now.minus(TTL);
    }

    public static Instant discardedAt() {
        return DISCARDED_AT;
    }

    public static Instant cleanupCutoff(Instant now) {
        return claimableSince(now).minus(CLEANUP_GRACE_PERIOD);
    }

    public UUID id() {
        return id;
    }

    public ImagePurpose purpose() {
        return purpose;
    }
}
