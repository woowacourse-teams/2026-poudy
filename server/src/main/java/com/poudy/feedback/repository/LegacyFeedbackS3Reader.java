package com.poudy.feedback.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubject;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.repository.S3FeedbackObjectStore.FailureKind;
import com.poudy.feedback.repository.S3FeedbackObjectStore.ObjectStoreException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@ConditionalOnProperty(name = "poudy.legacy-s3-migration.enabled", havingValue = "true")
public class LegacyFeedbackS3Reader {

    private static final String KEY_PREFIX = "poudy/feedback/";
    private static final String DOCUMENT_FILE_NAME = "/feedback.json";
    private static final String MANAGEMENT_FILE_NAME = "/management.json";
    private static final String PRODUCT_CORRECTION_TYPE = "PRODUCT_CORRECTION";

    private final S3FeedbackObjectStore objectStore;
    private final ObjectMapper objectMapper;

    public LegacyFeedbackS3Reader(S3FeedbackObjectStore objectStore, ObjectMapper objectMapper) {
        this.objectStore = objectStore;
        this.objectMapper = objectMapper;
    }

    public List<Feedback> findAll() {
        try {
            objectStore.requireConfigured();
            return objectStore.listAll(KEY_PREFIX).stream()
                .filter(object -> isDocumentKey(object.key()))
                .map(object -> read(object.key()))
                .toList();
        } catch (ObjectStoreException exception) {
            throw new InfrastructureException("기존 의견 목록을 S3에서 읽지 못했습니다.", exception);
        }
    }

    private Feedback read(String key) {
        try {
            Feedback feedback = feedbackOf(objectStore.read(key));
            return withManagement(feedback);
        } catch (ObjectStoreException exception) {
            throw new InfrastructureException("기존 의견 원본을 S3에서 읽지 못했습니다.", exception);
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
            throw new InfrastructureException("기존 의견 관리 상태를 S3에서 읽지 못했습니다.", exception);
        } catch (JacksonException | IllegalArgumentException | NullPointerException exception) {
            throw new InfrastructureException("기존 의견 관리 상태를 해석하지 못했습니다.", exception);
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
            throw new InfrastructureException("기존 의견 원본을 해석하지 못했습니다.", exception);
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

    private static String managementKeyOf(UUID feedbackId) {
        return KEY_PREFIX + feedbackId + MANAGEMENT_FILE_NAME;
    }
}
