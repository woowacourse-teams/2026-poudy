package com.poudy.feedback.service;

import com.poudy.feedback.service.FeedbackImageRelay.RelayCounts;
import java.time.Clock;
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

    private final FeedbackImageRelay imageRelay;
    private final Clock clock;

    public FeedbackImageReconciler(FeedbackImageRelay imageRelay, @Qualifier("feedbackClock") Clock clock) {
        this.imageRelay = imageRelay;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${poudy.feedback.image-reconciliation.relay-interval:PT5M}", initialDelayString = "${poudy.feedback.image-reconciliation.relay-initial-delay:PT1M}")
    public void relayPendingImages() {
        try {
            RelayCounts counts = imageRelay.relayPending(clock.instant());
            if (counts.total() > 0) {
                log.info(
                    "의견 이미지 정리를 완료했습니다. transferred={}, failed={}, expiredPending={}",
                    counts.transferred(),
                    counts.failed(),
                    counts.expired()
                );
            }
        } catch (RuntimeException exception) {
            log.error(
                "의견 이미지 정리 실행에 실패했습니다. failureType={}",
                exception.getClass().getSimpleName()
            );
        }
    }
}
