package com.poudy.feedback.domain;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class LegacyFeedbackImages {

    private final List<LegacyFeedbackImage> images;

    public LegacyFeedbackImages(List<LegacyFeedbackImage> images) {
        this.images = List.copyOf(images);
    }

    public List<UUID> imageIds() {
        return images.stream().map(LegacyFeedbackImage::imageId).toList();
    }

    public LegacyImageMigration classify(Map<UUID, UUID> feedbackIdsByImage) {
        List<LegacyFeedbackImage> attached = images.stream()
            .filter(image -> image.isAttachedIn(feedbackIdsByImage))
            .toList();
        List<LegacyFeedbackImage> unusedPending = images.stream()
            .filter(image -> image.isUnusedPendingIn(feedbackIdsByImage))
            .toList();
        return new LegacyImageMigration(attached, unusedPending);
    }
}
