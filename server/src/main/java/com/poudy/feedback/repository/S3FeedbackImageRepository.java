package com.poudy.feedback.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.InvalidFeedbackImageIdException;
import com.poudy.feedback.repository.S3FeedbackObjectStore.FailureKind;
import com.poudy.feedback.repository.S3FeedbackObjectStore.ObjectStoreException;
import com.poudy.feedback.repository.S3FeedbackObjectStore.StoredObject;
import com.poudy.feedback.service.FeedbackImageProcessor.ProcessedImage;
import java.time.Duration;
import java.time.Instant;
import java.time.InstantSource;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Repository
public class S3FeedbackImageRepository {

    static final Duration PENDING_TTL = Duration.ofHours(24);
    static final Duration CLAIM_GRACE_PERIOD = Duration.ofMinutes(10);

    private static final String PENDING_PREFIX = "poudy/feedback/pending/";
    private static final String CLAIM_PREFIX = "poudy/feedback/claims/";
    private static final String FEEDBACK_PREFIX = "poudy/feedback/";

    private final S3FeedbackObjectStore objectStore;
    private final ObjectMapper objectMapper;

    public S3FeedbackImageRepository(
        S3FeedbackObjectStore objectStore,
        ObjectMapper objectMapper
    ) {
        this.objectStore = objectStore;
        this.objectMapper = objectMapper;
    }

    public FeedbackImage savePending(ProcessedImage processed) {
        FeedbackImage image = FeedbackImage.create(processed.format());
        try {
            objectStore.putIfAbsent(
                pendingKey(image),
                image.format().contentType(),
                processed.bytes()
            );
            return image;
        } catch (ObjectStoreException exception) {
            throw infrastructure();
        }
    }

    public void cleanupPending(List<FeedbackImage> images) {
        images.forEach(image -> delete(pendingKey(image)));
    }

    public List<PendingImage> resolve(List<UUID> imageIds, Instant now) {
        List<PendingImage> resolved = new ArrayList<>();
        for (UUID imageId : imageIds) {
            Optional<PendingImage> jpeg = head(imageId, FeedbackImageFormat.JPEG);
            Optional<PendingImage> png = head(imageId, FeedbackImageFormat.PNG);
            if (jpeg.isPresent() == png.isPresent()) {
                throw new InvalidFeedbackImageIdException();
            }
            PendingImage image = jpeg.orElseGet(png::orElseThrow);
            if (!now.isBefore(image.lastModified().plus(PENDING_TTL))) {
                throw new InvalidFeedbackImageIdException();
            }
            resolved.add(image);
        }
        return List.copyOf(resolved);
    }

    public Claim claimAndCopy(
        UUID feedbackId,
        List<PendingImage> images,
        InstantSource timeSource
    ) {
        List<PendingImage> ordered = images.stream()
            .sorted(Comparator.comparing(image -> image.image().id()))
            .toList();
        List<FeedbackImage> claimed = new ArrayList<>();
        try {
            for (PendingImage image : ordered) {
                Instant claimedAt = timeSource.instant();
                if (!claimedAt.isBefore(image.lastModified().plus(PENDING_TTL))) {
                    throw new InvalidFeedbackImageIdException();
                }
                claim(feedbackId, image);
                claimed.add(image.image());
            }
            for (PendingImage image : images) {
                copy(feedbackId, image);
            }
            return new Claim(
                feedbackId,
                images.stream().map(PendingImage::image).toList()
            );
        } catch (RuntimeException exception) {
            rollback(new Claim(feedbackId, claimed));
            throw exception;
        }
    }

    public boolean rollback(Claim claim) {
        boolean complete = true;
        for (FeedbackImage image : claim.images()) {
            boolean finalDeleted = delete(finalKey(claim.feedbackId(), image));
            if (finalDeleted) {
                complete &= delete(claimKey(image.id()));
            } else {
                complete = false;
            }
        }
        return complete;
    }

    public boolean commit(Claim claim) {
        boolean complete = true;
        for (FeedbackImage image : claim.images()) {
            boolean pendingDeleted = delete(pendingKey(image));
            if (pendingDeleted) {
                complete &= delete(claimKey(image.id()));
            } else {
                complete = false;
            }
        }
        return complete;
    }

    public CleanupCounts reconcileClaims(Instant now) {
        int committed = 0;
        int rolledBack = 0;
        for (StoredObject object : listAll(CLAIM_PREFIX)) {
            if (now.isBefore(object.lastModified().plus(CLAIM_GRACE_PERIOD))) {
                continue;
            }
            Optional<ClaimDocument> claimDocument = readClaim(object.key());
            if (claimDocument.isEmpty()) {
                continue;
            }
            ClaimDocument document = claimDocument.get();
            if (existsExactly(feedbackKey(document.feedbackId()))) {
                commitRecovered(document.image());
                committed++;
            } else {
                rollbackRecovered(document.feedbackId(), document.image());
                rolledBack++;
            }
        }
        return CleanupCounts.claims(committed, rolledBack);
    }

    public CleanupCounts cleanupStorage(Instant now) {
        return CleanupCounts.storage(cleanupExpiredPending(now));
    }

    private int cleanupExpiredPending(Instant now) {
        int deleted = 0;
        for (StoredObject object : listAll(PENDING_PREFIX)) {
            if (now.isBefore(object.lastModified().plus(PENDING_TTL))) {
                continue;
            }
            Optional<FeedbackImage> image = imageFromPendingKey(object.key());
            if (image.isEmpty()) {
                continue;
            }
            if (!existsExactly(claimKey(image.get().id()))) {
                deleteRequired(object.key());
                deleted++;
            }
        }
        return deleted;
    }

    private void commitRecovered(FeedbackImage image) {
        deleteRequired(pendingKey(image));
        deleteRequired(claimKey(image.id()));
    }

    private void rollbackRecovered(UUID feedbackId, FeedbackImage image) {
        deleteRequired(finalKey(feedbackId, image));
        deleteRequired(claimKey(image.id()));
    }

    private static Optional<FeedbackImage> imageFromPendingKey(String key) {
        if (!key.startsWith(PENDING_PREFIX)) {
            return Optional.empty();
        }
        return imageFromFileName(key.substring(PENDING_PREFIX.length()));
    }

    private static Optional<FeedbackImage> imageFromFileName(String fileName) {
        int extensionStart = fileName.lastIndexOf('.');
        if (extensionStart <= 0 || extensionStart == fileName.length() - 1) {
            return Optional.empty();
        }
        try {
            return Optional.of(
                new FeedbackImage(
                    UUID.fromString(fileName.substring(0, extensionStart)),
                    FeedbackImageFormat.fromExtension(fileName.substring(extensionStart + 1))
                )
            );
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private Optional<ClaimDocument> readClaim(String key) {
        try {
            byte[] body = readBytes(key);
            JsonNode document = objectMapper.readTree(body);
            UUID imageId = imageIdFromClaimKey(key);
            FeedbackImageFormat format = FeedbackImageFormat.fromExtension(requiredText(document, "extension"));
            return Optional.of(
                new ClaimDocument(
                    UUID.fromString(requiredText(document, "feedbackId")),
                    new FeedbackImage(imageId, format)
                )
            );
        } catch (JacksonException | IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private byte[] readBytes(String key) {
        try {
            return objectStore.read(key);
        } catch (ObjectStoreException exception) {
            throw infrastructure();
        }
    }

    private static String requiredText(JsonNode document, String fieldName) {
        JsonNode value = document.get(fieldName);
        if (value == null || !value.isTextual() || value.asText().isBlank()) {
            throw new IllegalArgumentException("claim 필드가 올바르지 않습니다.");
        }
        return value.asText();
    }

    private boolean existsExactly(String key) {
        try {
            return objectStore.existsExactly(key);
        } catch (ObjectStoreException exception) {
            throw infrastructure();
        }
    }

    private List<StoredObject> listAll(String prefix) {
        try {
            return objectStore.listAll(prefix);
        } catch (ObjectStoreException exception) {
            throw infrastructure();
        }
    }

    private static UUID imageIdFromClaimKey(String key) {
        if (!key.startsWith(CLAIM_PREFIX) || !key.endsWith(".json")) {
            throw new IllegalArgumentException("잘못된 claim key입니다.");
        }
        return UUID.fromString(key.substring(CLAIM_PREFIX.length(), key.length() - ".json".length()));
    }

    private Optional<PendingImage> head(UUID imageId, FeedbackImageFormat format) {
        FeedbackImage image = new FeedbackImage(imageId, format);
        try {
            return objectStore.head(pendingKey(image))
                .map(metadata -> new PendingImage(image, metadata.eTag(), metadata.lastModified()));
        } catch (ObjectStoreException exception) {
            throw infrastructure();
        }
    }

    private void claim(UUID feedbackId, PendingImage pending) {
        byte[] body;
        try {
            Map<String, String> document = new LinkedHashMap<>();
            document.put("feedbackId", feedbackId.toString());
            document.put("extension", pending.image().format().extension());
            body = objectMapper.writeValueAsBytes(document);
        } catch (JacksonException exception) {
            throw infrastructure();
        }

        try {
            objectStore.putIfAbsent(
                claimKey(pending.image().id()),
                "application/json; charset=UTF-8",
                body
            );
        } catch (ObjectStoreException exception) {
            if (exception.kind() == FailureKind.PRECONDITION_FAILED) {
                throw new InvalidFeedbackImageIdException();
            }
            if ((exception.kind() == FailureKind.CONFLICT
                || exception.kind() == FailureKind.RETRYABLE)
                && hasSameClaim(feedbackId, pending)) {
                return;
            }
            throw infrastructure();
        }
    }

    private boolean hasSameClaim(UUID feedbackId, PendingImage pending) {
        String key = claimKey(pending.image().id());
        if (!existsExactly(key)) {
            return false;
        }
        return readClaim(key)
            .filter(document -> document.belongsTo(feedbackId, pending))
            .isPresent();
    }

    private void copy(UUID feedbackId, PendingImage pending) {
        try {
            objectStore.copy(
                pendingKey(pending.image()),
                pending.eTag(),
                finalKey(feedbackId, pending.image()),
                pending.image().format().contentType()
            );
        } catch (ObjectStoreException exception) {
            if (exception.kind() == FailureKind.NOT_FOUND
                || exception.kind() == FailureKind.PRECONDITION_FAILED) {
                throw new InvalidFeedbackImageIdException();
            }
            throw infrastructure();
        }
    }

    private boolean delete(String key) {
        try {
            objectStore.delete(key);
            return true;
        } catch (ObjectStoreException exception) {
            return false;
        }
    }

    private void deleteRequired(String key) {
        try {
            objectStore.delete(key);
        } catch (ObjectStoreException exception) {
            throw infrastructure();
        }
    }

    private static String pendingKey(FeedbackImage image) {
        return PENDING_PREFIX + image.id() + "." + image.format().extension();
    }

    private static String claimKey(UUID imageId) {
        return CLAIM_PREFIX + imageId + ".json";
    }

    private static String finalKey(UUID feedbackId, FeedbackImage image) {
        return FEEDBACK_PREFIX + feedbackId + "/images/" + image.id() + "." + image.format().extension();
    }

    private static String feedbackKey(UUID feedbackId) {
        return FEEDBACK_PREFIX + feedbackId + "/feedback.json";
    }

    private static InfrastructureException infrastructure() {
        return new InfrastructureException("의견 이미지 저장소를 처리하지 못했습니다.");
    }

    public record CleanupCounts(
        int committedClaims,
        int rolledBackClaims,
        int expiredPending) {

        private static CleanupCounts claims(int committedClaims, int rolledBackClaims) {
            return new CleanupCounts(committedClaims, rolledBackClaims, 0);
        }

        private static CleanupCounts storage(int expiredPending) {
            return new CleanupCounts(0, 0, expiredPending);
        }

        public int total() {
            return committedClaims + rolledBackClaims + expiredPending;
        }
    }

    record ClaimDocument(UUID feedbackId, FeedbackImage image) {

        private boolean belongsTo(UUID expectedFeedbackId, PendingImage pending) {
            return feedbackId.equals(expectedFeedbackId)
                && image.equals(pending.image());
        }
    }

    static record PendingImage(FeedbackImage image, String eTag, Instant lastModified) {
    }

    static record Claim(UUID feedbackId, List<FeedbackImage> images) {

        Claim {
            images = List.copyOf(images);
        }
    }

}
