package com.poudy.feedback.service;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.PendingImage;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class FeedbackImageTransferService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackImageTransferService.class);

    private final FeedbackRepository feedbackRepository;
    private final S3FeedbackImageRepository imageRepository;
    private final Clock clock;
    private final boolean scheduleEnabled;

    public FeedbackImageTransferService(
        FeedbackRepository feedbackRepository,
        S3FeedbackImageRepository imageRepository,
        Clock clock,
        @Value("${poudy.feedback.image-transfer.enabled:false}") boolean scheduleEnabled
    ) {
        this.feedbackRepository = feedbackRepository;
        this.imageRepository = imageRepository;
        this.clock = clock;
        this.scheduleEnabled = scheduleEnabled;
    }

    public void transfer(Feedback feedback) {
        feedback.images().forEach(image -> transferSafely(feedback.id(), image));
    }

    @Scheduled(fixedDelayString = "${poudy.feedback.image-transfer.interval:PT5M}", initialDelayString = "${poudy.feedback.image-transfer.initial-delay:PT1M}")
    public void transferPendingImages() {
        if (!scheduleEnabled) {
            return;
        }
        try {
            TransferCounts counts = transferPending(clock.instant());
            if (counts.total() > 0) {
                log.info(
                    "의견 이미지 정리를 완료했습니다. transferred={}, failed={}, expiredPending={}",
                    counts.transferred(),
                    counts.failed(),
                    counts.expired()
                );
            }
        } catch (RuntimeException exception) {
            log.error("의견 이미지 정리 실행에 실패했습니다. failureType={}", exception.getClass().getSimpleName());
        }
    }

    public TransferCounts transferPending(Instant now) {
        List<PendingImage> pendingImages = imageRepository.findAllPending();
        Map<UUID, UUID> owners = feedbackRepository.feedbackIdsByImage(
            pendingImages.stream().map(pending -> pending.image().id()).toList()
        );
        List<PendingImage> ownedImages = pendingImages.stream()
            .filter(pending -> owners.containsKey(pending.image().id()))
            .toList();
        List<PendingImage> expiredOrphans = pendingImages.stream()
            .filter(pending -> !owners.containsKey(pending.image().id()) && pending.canBeCleanedUp(now))
            .toList();
        long transferred = ownedImages.stream()
            .filter(pending -> transferSafely(owners.get(pending.image().id()), pending.image()))
            .count();
        expiredOrphans.forEach(pending -> imageRepository.deletePending(pending.image()));
        return new TransferCounts(transferred, ownedImages.size() - transferred, expiredOrphans.size());
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

    public record TransferCounts(long transferred, long failed, long expired) {

        public long total() {
            return transferred + failed + expired;
        }
    }
}
