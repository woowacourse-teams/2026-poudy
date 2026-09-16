package com.poudy.feedback.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubject;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.repository.S3FeedbackObjectStore.FailureKind;
import com.poudy.feedback.repository.S3FeedbackObjectStore.ObjectStoreException;
import java.nio.charset.StandardCharsets;
import java.time.InstantSource;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Repository
public class S3FeedbackRepository {

    private static final Logger log = LoggerFactory.getLogger(S3FeedbackRepository.class);
    private static final String KEY_PREFIX = "poudy/feedback/";
    private static final String DOCUMENT_FILE_NAME = "/feedback.json";
    private static final String MANAGEMENT_FILE_NAME = "/management.json";
    private static final String CONTENT_TYPE = "application/json; charset=" + StandardCharsets.UTF_8.name();
    private static final String PRODUCT_CORRECTION_TYPE = "PRODUCT_CORRECTION";

    private final S3FeedbackObjectStore objectStore;
    private final S3FeedbackImageRepository imageRepository;
    private final ObjectMapper objectMapper;

    public S3FeedbackRepository(
        S3FeedbackObjectStore objectStore,
        S3FeedbackImageRepository imageRepository,
        ObjectMapper objectMapper
    ) {
        this.objectStore = objectStore;
        this.imageRepository = imageRepository;
        this.objectMapper = objectMapper;
    }

    PreparedDocument prepare(Feedback feedback) {
        try {
            return new PreparedDocument(objectMapper.writeValueAsBytes(documentOf(feedback)));
        } catch (JacksonException exception) {
            throw new InfrastructureException("의견 원본을 직렬화하지 못했습니다.");
        }
    }

    SaveStatus save(Feedback feedback, PreparedDocument document) {
        try {
            objectStore.putIfAbsent(keyOf(feedback.id()), CONTENT_TYPE, document.bytes());
            return SaveStatus.SUCCESS;
        } catch (ObjectStoreException exception) {
            return verifyCommit(feedback);
        }
    }

    public void save(Feedback feedback) {
        PreparedDocument document = prepare(feedback);
        if (save(feedback, document) != SaveStatus.SUCCESS) {
            throw new InfrastructureException("의견 원본을 S3에 저장하지 못했습니다.");
        }
    }

    public Feedback save(Feedback feedback, List<UUID> imageIds, InstantSource timeSource) {
        if (imageIds.isEmpty()) {
            save(feedback);
            return feedback;
        }

        List<S3FeedbackImageRepository.PendingImage> pending = imageRepository.resolve(imageIds, timeSource.instant());
        Feedback attached = feedback
            .attachImages(pending.stream().map(S3FeedbackImageRepository.PendingImage::image).toList());
        PreparedDocument document = prepare(attached);
        S3FeedbackImageRepository.Claim claim = imageRepository.claimAndCopy(attached.id(), pending, timeSource);
        SaveStatus status = save(attached, document);
        if (status == SaveStatus.FAILURE) {
            imageRepository.rollback(claim);
            throw new InfrastructureException("의견 원본을 S3에 저장하지 못했습니다.");
        }
        if (status == SaveStatus.UNKNOWN) {
            throw new InfrastructureException("의견 저장 결과를 확인하지 못했습니다.");
        }
        if (!imageRepository.commit(claim)) {
            log.error(
                "의견 이미지 commit 정리를 완료하지 못했습니다. feedbackId={}, imageCount={}",
                attached.id(),
                attached.images().size()
            );
        }
        return attached;
    }

    public Feedback findById(UUID feedbackId) {
        return read(keyOf(feedbackId))
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    public List<Feedback> findAll(FeedbackStatus status, FeedbackSubjectType type) {
        try {
            return objectStore.listAll(KEY_PREFIX).stream()
                .filter(object -> isDocumentKey(object.key()))
                .flatMap(object -> read(object.key()).stream())
                .filter(feedback -> feedback.matches(status, type))
                .sorted(
                    Comparator.comparing(Feedback::receivedAt).reversed()
                        .thenComparing(Feedback::id, Comparator.reverseOrder())
                )
                .toList();
        } catch (ObjectStoreException exception) {
            throw new InfrastructureException("의견 목록을 S3에서 읽지 못했습니다.");
        }
    }

    public void updateStatus(Feedback feedback) {
        try {
            objectStore.replace(
                managementKeyOf(feedback.id()),
                CONTENT_TYPE,
                objectMapper.writeValueAsBytes(managementDocumentOf(feedback))
            );
        } catch (ObjectStoreException | JacksonException exception) {
            throw new InfrastructureException("의견 상태를 S3에 저장하지 못했습니다.");
        }
    }

    private Optional<Feedback> read(String key) {
        try {
            Feedback feedback = feedbackOf(objectStore.read(key));
            return Optional.of(withManagement(feedback));
        } catch (ObjectStoreException exception) {
            if (exception.kind() == FailureKind.NOT_FOUND) {
                return Optional.empty();
            }
            throw new InfrastructureException("의견 원본을 S3에서 읽지 못했습니다.");
        }
    }

    private Feedback withManagement(Feedback feedback) {
        try {
            JsonNode document = objectMapper.readTree(objectStore.read(managementKeyOf(feedback.id())));
            return new Feedback(
                feedback.id(),
                feedback.subject(),
                feedback.content(),
                feedback.receivedAt(),
                feedback.images(),
                FeedbackStatus.valueOf(requiredText(document, "status")),
                OffsetDateTime.parse(requiredText(document, "statusChangedAt")),
                optionalDateTime(document, "completedAt", null)
            );
        } catch (ObjectStoreException exception) {
            if (exception.kind() == FailureKind.NOT_FOUND) {
                return feedback;
            }
            throw new InfrastructureException("의견 관리 상태를 S3에서 읽지 못했습니다.");
        } catch (JacksonException | IllegalArgumentException | NullPointerException exception) {
            throw new InfrastructureException("의견 관리 상태를 해석하지 못했습니다.", exception);
        }
    }

    private Feedback feedbackOf(byte[] body) {
        try {
            JsonNode document = objectMapper.readTree(body);
            OffsetDateTime receivedAt = OffsetDateTime.parse(requiredText(document, "receivedAt"));
            return new Feedback(
                UUID.fromString(requiredText(document, "feedbackId")),
                subjectOf(document),
                new FeedbackContent(requiredText(document, "content")),
                receivedAt,
                imagesOf(document.path("images")),
                FeedbackStatus.RECEIVED,
                receivedAt,
                null
            );
        } catch (JacksonException | IllegalArgumentException | NullPointerException exception) {
            throw new InfrastructureException("의견 원본을 해석하지 못했습니다.", exception);
        }
    }

    private static List<FeedbackImage> imagesOf(JsonNode images) {
        if (images.isMissingNode() || images.isNull()) {
            return List.of();
        }
        if (!images.isArray()) {
            throw new IllegalArgumentException("이미지 목록 형식이 올바르지 않습니다.");
        }
        List<FeedbackImage> result = new ArrayList<>();
        for (JsonNode image : images) {
            result.add(
                new FeedbackImage(
                    UUID.fromString(requiredText(image, "imageId")),
                    FeedbackImageFormat.fromExtension(requiredText(image, "extension"))
                )
            );
        }
        return result;
    }

    private static FeedbackSubject subjectOf(JsonNode document) {
        String type = requiredText(document, "type");
        if (PRODUCT_CORRECTION_TYPE.equals(type)) {
            return new ProductCorrection(requiredLong(document, "productId"), requiredText(document, "productName"));
        }
        return new ServiceFeedback(FeedbackType.valueOf(type), FeedbackPath.from(optionalText(document, "path")));
    }

    private static long requiredLong(JsonNode document, String field) {
        JsonNode value = document.get(field);
        if (value == null || !value.isIntegralNumber()) {
            throw new IllegalArgumentException(field + " 값이 필요합니다.");
        }
        return value.asLong();
    }

    private static OffsetDateTime optionalDateTime(JsonNode document, String field, OffsetDateTime defaultValue) {
        String value = optionalText(document, field);
        return value == null ? defaultValue : OffsetDateTime.parse(value);
    }

    private static String requiredText(JsonNode document, String field) {
        String value = optionalText(document, field);
        if (value == null) {
            throw new IllegalArgumentException(field + " 값이 필요합니다.");
        }
        return value;
    }

    private static String optionalText(JsonNode document, String field) {
        JsonNode value = document.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isTextual() || value.asText().isBlank()) {
            throw new IllegalArgumentException(field + " 값이 올바르지 않습니다.");
        }
        return value.asText();
    }

    private SaveStatus verifyCommit(Feedback feedback) {
        try {
            return objectStore.existsExactly(keyOf(feedback.id())) ? SaveStatus.SUCCESS : SaveStatus.FAILURE;
        } catch (ObjectStoreException exception) {
            return SaveStatus.UNKNOWN;
        }
    }

    private static boolean isDocumentKey(String key) {
        if (!key.startsWith(KEY_PREFIX) || !key.endsWith(DOCUMENT_FILE_NAME)) {
            return false;
        }
        String id = key.substring(KEY_PREFIX.length(), key.length() - DOCUMENT_FILE_NAME.length());
        try {
            UUID.fromString(id);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String keyOf(UUID feedbackId) {
        return KEY_PREFIX + feedbackId + DOCUMENT_FILE_NAME;
    }

    private static String managementKeyOf(UUID feedbackId) {
        return KEY_PREFIX + feedbackId + MANAGEMENT_FILE_NAME;
    }

    private static Map<String, Object> documentOf(Feedback feedback) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("feedbackId", feedback.id().toString());
        putSubject(document, feedback.subject());
        document.put("content", feedback.content().value());
        document.put("receivedAt", feedback.receivedAt().toString());
        document.put("images", feedback.images().stream().map(S3FeedbackRepository::documentOf).toList());
        return document;
    }

    private static Map<String, Object> managementDocumentOf(Feedback feedback) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("status", feedback.status().name());
        document.put("statusChangedAt", feedback.statusChangedAt().toString());
        document.put("completedAt", feedback.completedAt() == null ? null : feedback.completedAt().toString());
        return document;
    }

    private static Map<String, String> documentOf(FeedbackImage image) {
        Map<String, String> document = new LinkedHashMap<>();
        document.put("imageId", image.id().toString());
        document.put("extension", image.format().extension());
        return document;
    }

    private static void putSubject(Map<String, Object> document, FeedbackSubject subject) {
        switch (subject) {
            case ServiceFeedback service -> {
                document.put("type", service.type().name());
                document.put("path", service.path().value().orElse(null));
            }
            case ProductCorrection correction -> {
                document.put("type", PRODUCT_CORRECTION_TYPE);
                document.put("productId", correction.productId());
                document.put("productName", correction.productName());
            }
        }
    }

    enum SaveStatus {
        SUCCESS,
        FAILURE,
        UNKNOWN
    }

    record PreparedDocument(byte[] bytes) {

        PreparedDocument {
            bytes = bytes.clone();
        }

        @Override
        public byte[] bytes() {
            return bytes.clone();
        }
    }
}
