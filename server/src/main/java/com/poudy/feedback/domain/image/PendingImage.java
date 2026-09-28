package com.poudy.feedback.domain.image;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

public final class PendingImage {

    public static final Duration TTL = Duration.ofHours(24);
    public static final Duration CLEANUP_GRACE_PERIOD = Duration.ofMinutes(10);

    private final FeedbackImage image;
    private final String eTag;
    private final Instant lastModified;

    public PendingImage(FeedbackImage image, String eTag, Instant lastModified) {
        this.image = image;
        this.eTag = eTag;
        this.lastModified = lastModified;
    }

    public FeedbackImage image() {
        return image;
    }

    public String eTag() {
        return eTag;
    }

    public Instant lastModified() {
        return lastModified;
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(lastModified.plus(TTL));
    }

    public boolean canBeCleanedUp(Instant now) {
        return !now.isBefore(lastModified.plus(TTL).plus(CLEANUP_GRACE_PERIOD));
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof PendingImage that)) {
            return false;
        }
        return Objects.equals(image, that.image)
            && Objects.equals(eTag, that.eTag)
            && Objects.equals(lastModified, that.lastModified);
    }

    @Override
    public int hashCode() {
        return Objects.hash(image, eTag, lastModified);
    }

    @Override
    public String toString() {
        return "PendingImage[image=" + image + ", eTag=" + eTag + ", lastModified=" + lastModified + "]";
    }
}
