package com.poudy.feedback.service;

import com.poudy.common.discord.DiscordWebhook;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackPage;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.ratelimit.FeedbackRateLimits;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.image.domain.ImageContent;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.S3ImageRepository;
import com.poudy.image.service.ImageUploadService;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import java.time.Clock;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);
    private static final int DISCORD_CONTENT_MAX_LENGTH = 2000;
    private static final DateTimeFormatter RECEIVED_AT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        .withZone(ZoneId.of("Asia/Seoul"));
    private static final String UNKNOWN_PATH = "알 수 없음";
    private static final String PRODUCT_CORRECTION_NAME = "제품 정보 정정";

    private final FeedbackRepository feedbackRepository;
    private final DiscordWebhook webhook;
    private final String webhookUrl;
    private final FeedbackRateLimits rateLimits;
    private final ProductRepository productRepository;
    private final ImageUploadService imageUploadService;
    private final S3ImageRepository imageRepository;
    private final Clock clock;

    public FeedbackService(
        FeedbackRepository feedbackRepository,
        DiscordWebhook webhook,
        @Value("${poudy.feedback.discord.webhook-url:}") String webhookUrl,
        FeedbackRateLimits rateLimits,
        ProductRepository productRepository,
        ImageUploadService imageUploadService,
        S3ImageRepository imageRepository,
        Clock clock
    ) {
        this.feedbackRepository = feedbackRepository;
        this.webhook = webhook;
        this.webhookUrl = webhookUrl;
        this.rateLimits = rateLimits;
        this.productRepository = productRepository;
        this.imageUploadService = imageUploadService;
        this.imageRepository = imageRepository;
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
        Feedback feedback = ServiceFeedback.register(type, FeedbackPath.from(path), content, clock);
        receive(feedback, imageIds, clientId);
    }

    public void submitProductCorrection(
        Long productId,
        String content,
        List<UUID> imageIds,
        String clientId
    ) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        Feedback feedback = ProductCorrection.register(product, content, clock);
        receive(feedback, imageIds, clientId);
    }

    private void receive(Feedback feedback, List<UUID> imageIds, String clientId) {
        Feedback attached = feedback.attachImages(imageIds);
        rateLimits.requireSubmitAllowed(clientId);
        feedbackRepository.save(attached);
        notifySafely(attached);
    }

    public List<UUID> uploadImages(List<MultipartFile> files, String clientId) {
        imageUploadService.validate(files, Feedback.MAX_IMAGE_COUNT);
        rateLimits.requireImageUploadAllowed(clientId);
        return imageUploadService.upload(files, ImagePurpose.FEEDBACK);
    }

    public FeedbackPage findAll(
        FeedbackStatus status,
        FeedbackSubjectType type,
        int page,
        int size
    ) {
        long totalElements = feedbackRepository.count(status, type);
        long offset = (long) (page - 1) * size;
        if (offset >= totalElements) {
            return new FeedbackPage(List.of(), totalElements);
        }
        return new FeedbackPage(feedbackRepository.findPage(status, type, offset, size), totalElements);
    }

    public ImageContent readImage(UUID feedbackId, UUID imageId) {
        if (!feedbackRepository.hasImage(feedbackId, imageId)) {
            throw new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND);
        }
        return imageRepository.read(imageId, ImagePurpose.FEEDBACK)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    public Feedback findById(UUID feedbackId) {
        return feedbackRepository.findById(feedbackId);
    }

    public Feedback changeStatus(UUID feedbackId, FeedbackStatus status) {
        return tryChangeStatus(feedbackId, status)
            .or(() -> tryChangeStatus(feedbackId, status))
            .orElseThrow(() -> new InfrastructureException("의견 상태가 동시에 바뀌어 저장하지 못했습니다."));
    }

    private Optional<Feedback> tryChangeStatus(UUID feedbackId, FeedbackStatus status) {
        Feedback current = feedbackRepository.findById(feedbackId);
        Feedback changed = current.changeStatus(status, clock);
        if (changed == current) {
            return Optional.of(current);
        }
        if (feedbackRepository.updateStatus(current.status(), changed)) {
            return Optional.of(changed);
        }
        return Optional.empty();
    }

    private void notifySafely(Feedback feedback) {
        try {
            webhook.send(webhookUrl, messageOf(feedback));
        } catch (RuntimeException exception) {
            log.error("Discord 의견 알림 전송에 실패했습니다. feedbackId={}", feedback.id());
        }
    }

    private static String messageOf(Feedback feedback) {
        String header = """
            💬 새로운 사용자 의견

            %s
            접수 시각: %s
            접수 ID: %s
            첨부 이미지: %d장

            """.formatted(
            subjectLinesOf(feedback),
            feedback.receivedAt().format(RECEIVED_AT_FORMAT),
            feedback.id(),
            feedback.imageIds().size()
        );

        return appendWithinLimit(header, feedback.content().value());
    }

    private static String subjectLinesOf(Feedback feedback) {
        return switch (feedback) {
            case ServiceFeedback service -> "유형: " + service.feedbackType().displayName()
                + "\n화면: " + service.path().value().orElse(UNKNOWN_PATH);
            case ProductCorrection correction -> "유형: " + PRODUCT_CORRECTION_NAME
                + "\n제품: " + correction.productName() + " (ID " + correction.productId() + ")";
        };
    }

    private static String appendWithinLimit(String header, String content) {
        int headerLength = header.codePointCount(0, header.length());
        int available = DISCORD_CONTENT_MAX_LENGTH - headerLength;
        int contentLength = content.codePointCount(0, content.length());

        if (contentLength <= available) {
            return header + content;
        }

        int end = content.offsetByCodePoints(0, available - 1);
        return header + content.substring(0, end) + "…";
    }
}
