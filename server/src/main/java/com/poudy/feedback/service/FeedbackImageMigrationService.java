package com.poudy.feedback.service;

import com.poudy.feedback.domain.LegacyFeedbackImage;
import com.poudy.feedback.domain.LegacyFeedbackImages;
import com.poudy.feedback.domain.LegacyImageMigration;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.LegacyFeedbackImageRepository;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.S3ImageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class FeedbackImageMigrationService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackImageMigrationService.class);

    private final LegacyFeedbackImageRepository legacyImageRepository;
    private final FeedbackRepository feedbackRepository;
    private final S3ImageRepository imageRepository;
    private final boolean scheduleEnabled;

    public FeedbackImageMigrationService(
        LegacyFeedbackImageRepository legacyImageRepository,
        FeedbackRepository feedbackRepository,
        S3ImageRepository imageRepository,
        @Value("${poudy.feedback.image-migration.enabled:false}") boolean scheduleEnabled
    ) {
        this.legacyImageRepository = legacyImageRepository;
        this.feedbackRepository = feedbackRepository;
        this.imageRepository = imageRepository;
        this.scheduleEnabled = scheduleEnabled;
    }

    @Scheduled(fixedDelayString = "${poudy.feedback.image-migration.interval:PT1H}", initialDelayString = "${poudy.feedback.image-migration.initial-delay:PT1M}")
    public void migrateScheduled() {
        if (!scheduleEnabled) {
            return;
        }
        try {
            MigrationCounts counts = migrate();
            if (counts.total() > 0) {
                log.info(
                    "이전 의견 이미지를 옮겼습니다. moved={}, discarded={}, failed={}",
                    counts.moved(),
                    counts.discarded(),
                    counts.failed()
                );
            }
        } catch (RuntimeException exception) {
            log.error("이전 의견 이미지 이동 실행에 실패했습니다. failureType={}", exception.getClass().getSimpleName());
        }
    }

    public MigrationCounts migrate() {
        LegacyFeedbackImages legacyImages = legacyImageRepository.findAll();
        LegacyImageMigration migration = legacyImages.classify(
            feedbackRepository.feedbackIdsByImage(legacyImages.imageIds())
        );
        long moved = migration.toMove().stream().filter(this::moveSafely).count();
        long discarded = migration.toDiscard().stream().filter(this::discardSafely).count();
        long failed = migration.failedAmong(moved, discarded);
        return new MigrationCounts(moved, discarded, failed);
    }

    private boolean moveSafely(LegacyFeedbackImage image) {
        try {
            imageRepository.copyFrom(image.key(), image.imageId(), ImagePurpose.FEEDBACK);
            legacyImageRepository.delete(image.key());
            return true;
        } catch (RuntimeException exception) {
            log.warn("이전 의견 이미지를 옮기지 못했습니다. imageId={}", image.imageId());
            return false;
        }
    }

    private boolean discardSafely(LegacyFeedbackImage image) {
        try {
            legacyImageRepository.delete(image.key());
            return true;
        } catch (RuntimeException exception) {
            log.warn("쓰이지 않은 이전 임시 이미지를 지우지 못했습니다. imageId={}", image.imageId());
            return false;
        }
    }

    public record MigrationCounts(long moved, long discarded, long failed) {

        public long total() {
            return moved + discarded + failed;
        }
    }
}
