package com.poudy.feedback.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.notification.FeedbackNotifier;
import com.poudy.feedback.repository.S3FeedbackRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);

    private final S3FeedbackRepository feedbackRepository;
    private final FeedbackNotifier feedbackNotifier;
    private final FeedbackRateLimiter rateLimiter;
    private final ProductRepository productRepository;
    private final Clock clock;

    public FeedbackService(
        S3FeedbackRepository feedbackRepository,
        FeedbackNotifier feedbackNotifier,
        FeedbackRateLimiter rateLimiter,
        ProductRepository productRepository,
        @Qualifier("feedbackClock") Clock clock
    ) {
        this.feedbackRepository = feedbackRepository;
        this.feedbackNotifier = feedbackNotifier;
        this.rateLimiter = rateLimiter;
        this.productRepository = productRepository;
        this.clock = clock;
    }

    public void submit(FeedbackType type, String content, String path, String clientId) {
        submit(type, content, path, List.of(), clientId);
    }

    public void submit(
        FeedbackType type,
        String content,
        String path,
        List<UUID> imageIds,
        String clientId
    ) {
        Feedback feedback = Feedback.register(new ServiceFeedback(type, FeedbackPath.from(path)), content, clock);
        receive(feedback, imageIds, clientId);
    }

    public void submitProductCorrection(
        Long productId,
        String content,
        List<UUID> imageIds,
        String clientId
    ) {
        Product product = productRepository.findAll()
            .findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        Feedback feedback = Feedback.register(new ProductCorrection(product.id(), product.name()), content, clock);
        receive(feedback, imageIds, clientId);
    }

    private void receive(Feedback feedback, List<UUID> imageIds, String clientId) {
        List<UUID> normalizedImageIds = Feedback.normalizeImageIds(imageIds);
        rateLimiter.requireAllowed(clientId);
        Feedback saved;
        if (normalizedImageIds.isEmpty()) {
            feedbackRepository.save(feedback);
            saved = feedback;
        } else {
            saved = feedbackRepository.save(feedback, normalizedImageIds, clock);
        }
        notifySafely(saved);
    }

    private void notifySafely(Feedback feedback) {
        try {
            feedbackNotifier.notify(feedback);
        } catch (RuntimeException exception) {
            log.error("Discord 의견 알림 전송에 실패했습니다. feedbackId={}", feedback.id());
        }
    }
}
