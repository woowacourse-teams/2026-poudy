package com.poudy.feedback.service;

import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository.CleanupCounts;
import java.time.Clock;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "poudy.feedback.image-reconciliation", name = "enabled", havingValue = "true")
public class FeedbackImageReconciler {

    private static final Logger log = LoggerFactory.getLogger(FeedbackImageReconciler.class);

    private final S3FeedbackImageRepository imageRepository;
    private final Clock clock;

    public FeedbackImageReconciler(
        S3FeedbackImageRepository imageRepository,
        @Qualifier("feedbackClock") Clock clock
    ) {
        this.imageRepository = imageRepository;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${poudy.feedback.image-reconciliation.claim-interval:PT5M}", initialDelayString = "${poudy.feedback.image-reconciliation.claim-initial-delay:PT1M}")
    public void reconcileClaims() {
        run("claim", () -> imageRepository.reconcileClaims(clock.instant()));
    }

    @Scheduled(fixedDelayString = "${poudy.feedback.image-reconciliation.cleanup-interval:PT1H}", initialDelayString = "${poudy.feedback.image-reconciliation.cleanup-initial-delay:PT1H}")
    public void cleanupStorage() {
        run("storage", () -> imageRepository.cleanupStorage(clock.instant()));
    }

    private static void run(
        String task,
        Supplier<CleanupCounts> operation
    ) {
        try {
            CleanupCounts counts = operation.get();
            if (counts.total() > 0) {
                log.info(
                    "의견 이미지 정리를 완료했습니다. committedClaims={}, rolledBackClaims={}, expiredPending={}, orphanedFinalImages={}",
                    counts.committedClaims(),
                    counts.rolledBackClaims(),
                    counts.expiredPending(),
                    counts.orphanedFinalImages()
                );
            }
        } catch (RuntimeException exception) {
            log.error(
                "의견 이미지 정리 실행에 실패했습니다. task={}, failureType={}",
                task,
                exception.getClass().getSimpleName()
            );
        }
    }
}
