package com.poudy.image.service;

import com.poudy.image.domain.PendingImage;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.image.repository.S3ImageRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class PendingImageCleanupService {

    private static final Logger log = LoggerFactory.getLogger(PendingImageCleanupService.class);

    private final PendingImageRepository pendingImageRepository;
    private final S3ImageRepository imageRepository;
    private final Clock clock;
    private final boolean scheduleEnabled;
    private final int batchSize;

    public PendingImageCleanupService(
        PendingImageRepository pendingImageRepository,
        S3ImageRepository imageRepository,
        Clock clock,
        @Value("${poudy.image.pending-cleanup.enabled:false}") boolean scheduleEnabled,
        @Value("${poudy.image.pending-cleanup.batch-size:500}") int batchSize
    ) {
        if (batchSize < 1) {
            throw new IllegalArgumentException("임시 이미지 정리 배치 크기는 1 이상이어야 합니다.");
        }
        this.pendingImageRepository = pendingImageRepository;
        this.imageRepository = imageRepository;
        this.clock = clock;
        this.scheduleEnabled = scheduleEnabled;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${poudy.image.pending-cleanup.interval:PT5M}", initialDelayString = "${poudy.image.pending-cleanup.initial-delay:PT1M}")
    public void cleanupScheduled() {
        if (!scheduleEnabled) {
            return;
        }
        try {
            CleanupCounts counts = cleanup(clock.instant());
            if (counts.total() > 0) {
                log.info("만료 임시 이미지 정리를 완료했습니다. deleted={}, failed={}", counts.deleted(), counts.failed());
            }
        } catch (RuntimeException exception) {
            log.error("만료 임시 이미지 정리 실행에 실패했습니다. failureType={}", exception.getClass().getSimpleName());
        }
    }

    public CleanupCounts cleanup(Instant now) {
        List<PendingImage> expired = pendingImageRepository.findExpired(now, batchSize);
        long deleted = expired.stream().filter(this::deleteSafely).count();
        return new CleanupCounts(deleted, expired.size() - deleted);
    }

    private boolean deleteSafely(PendingImage image) {
        try {
            imageRepository.delete(image.id(), image.purpose());
            pendingImageRepository.delete(image.id());
            return true;
        } catch (RuntimeException exception) {
            log.warn(
                "만료 임시 이미지를 지우지 못했습니다. 다음 주기에 다시 시도합니다. imageId={}, failureType={}",
                image.id(),
                exception.getClass().getSimpleName()
            );
            return false;
        }
    }

    public record CleanupCounts(long deleted, long failed) {

        public long total() {
            return deleted + failed;
        }
    }
}
