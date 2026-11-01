package com.poudy.image.service;

import com.poudy.exception.TooManyRequestsException;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.PendingImage;
import com.poudy.image.domain.ProcessedImage;
import com.poudy.image.processing.ImageProcessor;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.image.repository.S3ImageRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageUploadService {

    private final ImageProcessor imageProcessor;
    private final PendingImageRepository pendingImageRepository;
    private final S3ImageRepository imageRepository;
    private final Clock clock;
    private final Semaphore processingPermits;

    public ImageUploadService(
        ImageProcessor imageProcessor,
        PendingImageRepository pendingImageRepository,
        S3ImageRepository imageRepository,
        Clock clock,
        @Value("${poudy.image.processing.max-concurrency:1}") int maxConcurrency
    ) {
        if (maxConcurrency < 1) {
            throw new IllegalArgumentException("이미지 처리 동시성은 1 이상이어야 합니다.");
        }
        this.imageProcessor = imageProcessor;
        this.pendingImageRepository = pendingImageRepository;
        this.imageRepository = imageRepository;
        this.clock = clock;
        this.processingPermits = new Semaphore(maxConcurrency, true);
    }

    public void validate(List<MultipartFile> files, int maxCount) {
        imageProcessor.validateBatch(files, maxCount);
    }

    public List<UUID> upload(List<MultipartFile> files, ImagePurpose purpose) {
        List<PendingImage> stored = new ArrayList<>();
        try {
            for (MultipartFile file : files) {
                ProcessedImage processed = processWithPermit(file, purpose);
                PendingImage image = PendingImage.create(purpose);
                pendingImageRepository.save(image, clock.instant());
                stored.add(image);
                imageRepository.save(image.id(), purpose, processed);
            }
            return stored.stream().map(PendingImage::id).toList();
        } catch (RuntimeException exception) {
            stored.forEach(this::discardQuietly);
            throw exception;
        }
    }

    private void discardQuietly(PendingImage image) {
        try {
            imageRepository.delete(image.id(), image.purpose());
            pendingImageRepository.delete(image.id());
        } catch (RuntimeException ignored) {
            return;
        }
    }

    private ProcessedImage processWithPermit(MultipartFile file, ImagePurpose purpose) {
        if (!processingPermits.tryAcquire()) {
            throw new TooManyRequestsException(Duration.ofSeconds(1));
        }

        try {
            return imageProcessor.process(file, purpose);
        } finally {
            processingPermits.release();
        }
    }
}
