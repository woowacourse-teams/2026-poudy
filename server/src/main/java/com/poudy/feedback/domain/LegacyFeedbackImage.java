package com.poudy.feedback.domain;

import java.util.Map;
import java.util.UUID;

public final class LegacyFeedbackImage {

    private final String key;
    private final UUID imageId;
    private final UUID feedbackId;

    private LegacyFeedbackImage(String key, UUID imageId, UUID feedbackId) {
        this.key = key;
        this.imageId = imageId;
        this.feedbackId = feedbackId;
    }

    public static LegacyFeedbackImage stored(String key, UUID imageId, UUID feedbackId) {
        return new LegacyFeedbackImage(key, imageId, feedbackId);
    }

    public static LegacyFeedbackImage pending(String key, UUID imageId) {
        return new LegacyFeedbackImage(key, imageId, null);
    }

    public boolean isAttachedIn(Map<UUID, UUID> feedbackIdsByImage) {
        UUID owner = feedbackIdsByImage.get(imageId);
        if (owner == null) {
            return false;
        }
        return feedbackId == null || owner.equals(feedbackId);
    }

    public boolean isUnusedPendingIn(Map<UUID, UUID> feedbackIdsByImage) {
        return feedbackId == null && !feedbackIdsByImage.containsKey(imageId);
    }

    public String key() {
        return key;
    }

    public UUID imageId() {
        return imageId;
    }
}
