package com.poudy.feedback.service;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "poudy.feedback.retention.enabled", havingValue = "true")
public class FeedbackRetentionService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackRetentionService.class);

    private final FeedbackRepository feedbackRepository;
    private final S3FeedbackImageRepository imageRepository;
    private final Clock clock;
    private final Duration maxAge;
    private final int batchSize;
    private final int maxBatches;

    public FeedbackRetentionService(
        FeedbackRepository feedbackRepository,
        S3FeedbackImageRepository imageRepository,
        @Qualifier("feedbackClock") Clock clock,
        @Value("${poudy.feedback.retention.max-age:P83D}") Duration maxAge,
        @Value("${poudy.feedback.retention.batch-size:500}") int batchSize,
        @Value("${poudy.feedback.retention.max-batches:20}") int maxBatches
    ) {
        if (maxAge.isNegative() || maxAge.isZero()) {
            throw new IllegalArgumentException("의견 보유기간은 0보다 길어야 합니다.");
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("의견 삭제 배치 크기는 1 이상이어야 합니다.");
        }
        if (maxBatches < 1) {
            throw new IllegalArgumentException("의견 삭제 최대 배치 수는 1 이상이어야 합니다.");
        }
        this.feedbackRepository = feedbackRepository;
        this.imageRepository = imageRepository;
        this.clock = clock;
        this.maxAge = maxAge;
        this.batchSize = batchSize;
        this.maxBatches = maxBatches;
    }

    @Scheduled(cron = "${poudy.feedback.retention.cron:0 30 3 * * *}", zone = "Asia/Seoul")
    public void purgeExpired() {
        OffsetDateTime cutoff = OffsetDateTime.now(clock).minus(maxAge);
        int selected = 0;
        int deleted = 0;
        int failed = 0;
        for (int batch = 0; batch < maxBatches; batch++) {
            List<Feedback> expired = feedbackRepository.findExpired(cutoff, batchSize);
            selected += expired.size();
            int batchFailures = 0;
            for (Feedback feedback : expired) {
                try {
                    imageRepository.deleteRetainedData(feedback.id(), feedback.images());
                    if (feedbackRepository.deleteExpired(feedback, cutoff)) {
                        deleted++;
                    }
                } catch (RuntimeException exception) {
                    batchFailures++;
                    log.error("만료 의견 삭제를 완료하지 못했습니다. 다음 주기에 재시도합니다.");
                }
            }
            failed += batchFailures;
            if (expired.size() < batchSize || batchFailures > 0) {
                break;
            }
        }
        if (selected > 0) {
            log.info("만료 의견 보유기간 정리를 마쳤습니다. selected={}, deleted={}, failed={}", selected, deleted, failed);
        }
    }
}
