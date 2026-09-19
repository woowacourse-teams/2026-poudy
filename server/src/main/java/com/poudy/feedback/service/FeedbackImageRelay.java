package com.poudy.feedback.service;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.service.PendingImageBatch.OwnedImage;
import com.poudy.feedback.service.PendingImageBatch.RelayPlan;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class FeedbackImageRelay {

    private static final Logger log = LoggerFactory.getLogger(FeedbackImageRelay.class);

    private final FeedbackRepository feedbackRepository;
    private final S3FeedbackImageRepository imageRepository;

    public FeedbackImageRelay(FeedbackRepository feedbackRepository, S3FeedbackImageRepository imageRepository) {
        this.feedbackRepository = feedbackRepository;
        this.imageRepository = imageRepository;
    }

    public void relay(Feedback feedback) {
        feedback.images().forEach(image -> transferSafely(feedback.id(), image));
    }

    public RelayCounts relayPending(Instant now) {
        PendingImageBatch pendingImages = new PendingImageBatch(imageRepository.findAllPending());
        Map<UUID, UUID> owners = feedbackRepository.feedbackIdsByImage(pendingImages.imageIds());
        RelayPlan plan = pendingImages.plan(owners, now);
        long transferred = plan.ownedImages().stream()
            .filter(this::transferSafely)
            .count();
        plan.expiredOrphans().forEach(imageRepository::deletePending);
        return new RelayCounts(
            transferred,
            plan.ownedImages().size() - transferred,
            plan.expiredOrphans().size()
        );
    }

    private boolean transferSafely(OwnedImage ownedImage) {
        return transferSafely(ownedImage.feedbackId(), ownedImage.image());
    }

    private boolean transferSafely(UUID feedbackId, FeedbackImage image) {
        try {
            if (imageRepository.transfer(feedbackId, image)) {
                return true;
            }
            log.error("의견 이미지의 원본과 최종 파일이 모두 없습니다. feedbackId={}, imageId={}", feedbackId, image.id());
            return false;
        } catch (RuntimeException exception) {
            log.warn(
                "의견 이미지를 옮기지 못했습니다. 다음 주기에 다시 시도합니다. feedbackId={}, imageId={}, failureType={}",
                feedbackId,
                image.id(),
                exception.getClass().getSimpleName()
            );
            return false;
        }
    }

    public record RelayCounts(long transferred, long failed, long expired) {

        public long total() {
            return transferred + failed + expired;
        }
    }
}
