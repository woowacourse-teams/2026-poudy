package com.poudy.feedback.service;

import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.repository.S3FeedbackImageRepository.PendingImage;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

final class PendingImageBatch {

    private final List<PendingImage> pendingImages;

    PendingImageBatch(List<PendingImage> pendingImages) {
        this.pendingImages = List.copyOf(Objects.requireNonNull(pendingImages));
    }

    List<UUID> imageIds() {
        return pendingImages.stream()
            .map(PendingImage::image)
            .map(FeedbackImage::id)
            .toList();
    }

    RelayPlan plan(Map<UUID, UUID> owners, Instant now) {
        Objects.requireNonNull(owners);
        Objects.requireNonNull(now);
        List<OwnedImage> ownedImages = new ArrayList<>();
        List<FeedbackImage> expiredOrphans = new ArrayList<>();

        for (PendingImage pending : pendingImages) {
            FeedbackImage image = pending.image();
            UUID feedbackId = owners.get(image.id());
            if (feedbackId != null) {
                ownedImages.add(new OwnedImage(feedbackId, image));
            } else if (pending.canBeCleanedUp(now)) {
                expiredOrphans.add(image);
            }
        }

        return new RelayPlan(ownedImages, expiredOrphans);
    }

    record OwnedImage(UUID feedbackId, FeedbackImage image) {

        OwnedImage {
            Objects.requireNonNull(feedbackId);
            Objects.requireNonNull(image);
        }
    }

    record RelayPlan(List<OwnedImage> ownedImages, List<FeedbackImage> expiredOrphans) {

        RelayPlan {
            ownedImages = List.copyOf(ownedImages);
            expiredOrphans = List.copyOf(expiredOrphans);
        }
    }
}
