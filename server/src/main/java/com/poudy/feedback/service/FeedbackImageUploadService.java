package com.poudy.feedback.service;

import com.poudy.exception.TooManyRequestsException;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.service.FeedbackImageProcessor.ProcessedImage;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FeedbackImageUploadService {

    private final FeedbackImageProcessor imageProcessor;
    private final S3FeedbackImageRepository imageRepository;
    private final FeedbackImageUploadRateLimiter rateLimiter;
    private final Semaphore processingPermits;

    public FeedbackImageUploadService(
            FeedbackImageProcessor imageProcessor,
            S3FeedbackImageRepository imageRepository,
            FeedbackImageUploadRateLimiter rateLimiter,
            @Value("${poudy.feedback.image-processing.max-concurrency:1}") int maxConcurrency) {
        if (maxConcurrency < 1) {
            throw new IllegalArgumentException("이미지 처리 동시성은 1 이상이어야 합니다.");
        }
        this.imageProcessor = imageProcessor;
        this.imageRepository = imageRepository;
        this.rateLimiter = rateLimiter;
        this.processingPermits = new Semaphore(maxConcurrency, true);
    }

    public List<UUID> upload(List<MultipartFile> files, String clientId) {
        imageProcessor.validateBatch(files);
        if (!processingPermits.tryAcquire()) {
            throw new TooManyRequestsException(Duration.ofSeconds(1));
        }

        try {
            rateLimiter.requireAllowed(clientId);
            List<FeedbackImage> stored = new ArrayList<>();
            try {
                for (MultipartFile file : files) {
                    ProcessedImage processed = imageProcessor.process(file);
                    stored.add(imageRepository.savePending(processed));
                }
                return stored.stream().map(FeedbackImage::id).toList();
            } catch (RuntimeException exception) {
                imageRepository.cleanupPending(stored);
                throw exception;
            }
        } finally {
            processingPermits.release();
        }
    }
}
