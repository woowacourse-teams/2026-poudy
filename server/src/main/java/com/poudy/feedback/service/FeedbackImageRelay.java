package com.poudy.feedback.service;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository.PendingImage;
import java.time.Instant;
import java.util.List;
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
        List<PendingImage> pending = imageRepository.findAllPending();
        Map<UUID, UUID> owners = feedbackRepository.feedbackIdsByImage(
            pending.stream().map(image -> image.image().id()).toList()
        );
        List<PendingImage> owned = pending.stream().filter(image -> owners.containsKey(image.image().id())).toList();
        List<PendingImage> expired = pending.stream()
            .filter(image -> !owners.containsKey(image.image().id()))
            .filter(image -> image.canBeCleanedUp(now))
            .toList();
        long transferred = owned.stream()
            .filter(image -> transferSafely(owners.get(image.image().id()), image.image()))
            .count();
        expired.forEach(image -> imageRepository.deletePending(image.image()));
        return new RelayCounts(transferred, owned.size() - transferred, expired.size());
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
