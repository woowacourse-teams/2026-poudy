package com.poudy.feedback.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.InvalidFeedbackImageIdException;
import com.poudy.feedback.domain.ProcessedImage;
import com.poudy.feedback.repository.S3FeedbackObjectStore.FailureKind;
import com.poudy.feedback.repository.S3FeedbackObjectStore.ObjectStoreException;
import com.poudy.feedback.repository.S3FeedbackObjectStore.StoredObject;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Repository;

@Repository
public class S3FeedbackImageRepository {

    static final Duration PENDING_TTL = Duration.ofHours(24);
    static final Duration CLEANUP_GRACE_PERIOD = Duration.ofMinutes(10);

    private static final String PENDING_PREFIX = "poudy/feedback/pending/";
    private static final String FEEDBACK_PREFIX = "poudy/feedback/";

    private final S3FeedbackObjectStore objectStore;

    public S3FeedbackImageRepository(S3FeedbackObjectStore objectStore) {
        this.objectStore = objectStore;
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
        images.forEach(image -> deleteQuietly(pendingKey(image)));
    }

    public List<PendingImage> resolve(List<UUID> imageIds, Instant now) {
        return imageIds.stream().map(imageId -> resolve(imageId, now)).toList();
    }

    public List<PendingImage> findAllPending() {
        return listAll(PENDING_PREFIX).stream()
            .flatMap(object -> pendingImageOf(object).stream())
            .toList();
    }

    public boolean transfer(UUID feedbackId, FeedbackImage image) {
        Optional<PendingImage> pending = head(image);
        if (pending.isEmpty()) {
            return existsExactly(finalKey(feedbackId, image));
        }
        try {
            objectStore.copy(
                pendingKey(image),
                pending.get().eTag(),
                finalKey(feedbackId, image),
                image.format().contentType()
            );
        } catch (ObjectStoreException exception) {
            if (exception.kind() != FailureKind.NOT_FOUND && exception.kind() != FailureKind.PRECONDITION_FAILED) {
                throw infrastructure();
            }
            return existsExactly(finalKey(feedbackId, image));
        }
        deleteRequired(pendingKey(image));
        return true;
    }

    public void deletePending(FeedbackImage image) {
        deleteRequired(pendingKey(image));
    }

    public void deleteRetainedData(UUID feedbackId, List<FeedbackImage> images) {
        images.forEach(image -> deleteRequired(finalKey(feedbackId, image)));
        deleteRequired(FEEDBACK_PREFIX + feedbackId + "/feedback.json");
        deleteRequired(FEEDBACK_PREFIX + feedbackId + "/management.json");
    }

    private PendingImage resolve(UUID imageId, Instant now) {
        List<PendingImage> found = Stream.of(FeedbackImageFormat.JPEG, FeedbackImageFormat.PNG)
            .flatMap(format -> head(new FeedbackImage(imageId, format)).stream())
            .toList();
        if (found.size() != 1 || found.getFirst().isExpired(now)) {
            throw new InvalidFeedbackImageIdException();
        }
        return found.getFirst();
    }

    private Optional<PendingImage> head(FeedbackImage image) {
        try {
            return objectStore.head(pendingKey(image))
                .map(metadata -> new PendingImage(image, metadata.eTag(), metadata.lastModified()));
        } catch (ObjectStoreException exception) {
            throw infrastructure();
        }
    }

    private static Optional<PendingImage> pendingImageOf(StoredObject object) {
        String fileName = object.key().substring(PENDING_PREFIX.length());
        int extensionStart = fileName.lastIndexOf('.');
        if (extensionStart <= 0 || extensionStart == fileName.length() - 1) {
            return Optional.empty();
        }
        try {
            FeedbackImage image = new FeedbackImage(
                UUID.fromString(fileName.substring(0, extensionStart)),
                FeedbackImageFormat.fromExtension(fileName.substring(extensionStart + 1))
            );
            return Optional.of(new PendingImage(image, object.eTag(), object.lastModified()));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
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

    private void deleteQuietly(String key) {
        try {
            objectStore.delete(key);
        } catch (ObjectStoreException exception) {
            return;
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

    private static String finalKey(UUID feedbackId, FeedbackImage image) {
        return FEEDBACK_PREFIX + feedbackId + "/images/" + image.id() + "." + image.format().extension();
    }

    private static InfrastructureException infrastructure() {
        return new InfrastructureException("의견 이미지 저장소를 처리하지 못했습니다.");
    }

    public record PendingImage(FeedbackImage image, String eTag, Instant lastModified) {

        public boolean isExpired(Instant now) {
            return !now.isBefore(lastModified.plus(PENDING_TTL));
        }

        public boolean canBeCleanedUp(Instant now) {
            return !now.isBefore(lastModified.plus(PENDING_TTL).plus(CLEANUP_GRACE_PERIOD));
        }
    }
}
