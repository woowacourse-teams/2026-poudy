package com.poudy.feedback.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.InvalidFeedbackImageIdException;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.ZoneId;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
public class FeedbackRepository {

    private static final String IMAGE_LOCK = "select count(*) from (select pg_advisory_xact_lock(hashtextextended(:imageId, 0))) as image_lock";

    private final FeedbackJpaRepository feedbackJpaRepository;
    private final ProductCorrectionRequestJpaRepository correctionJpaRepository;
    private final S3FeedbackImageRepository imageRepository;
    private final EntityManager entityManager;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;
    private final ZoneId zone;

    public FeedbackRepository(
        FeedbackJpaRepository feedbackJpaRepository,
        ProductCorrectionRequestJpaRepository correctionJpaRepository,
        S3FeedbackImageRepository imageRepository,
        EntityManager entityManager,
        PlatformTransactionManager transactionManager,
        @Qualifier("feedbackClock") Clock clock
    ) {
        this.feedbackJpaRepository = feedbackJpaRepository;
        this.correctionJpaRepository = correctionJpaRepository;
        this.imageRepository = imageRepository;
        this.entityManager = entityManager;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.clock = clock;
        this.zone = clock.getZone();
    }

    public void save(Feedback feedback) {
        if (insert(feedback) != SaveStatus.SUCCESS) {
            throw new InfrastructureException("의견을 DB에 저장하지 못했습니다.");
        }
    }

    public Feedback save(Feedback feedback, List<UUID> imageIds) {
        if (imageIds.isEmpty()) {
            save(feedback);
            return feedback;
        }

        requireUnusedImages(imageIds);
        List<S3FeedbackImageRepository.PendingImage> pending = imageRepository.resolve(imageIds, clock.instant());
        Feedback attached = feedback
            .attachImages(pending.stream().map(S3FeedbackImageRepository.PendingImage::image).toList());
        SaveStatus status = insert(attached);
        if (status == SaveStatus.FAILURE) {
            requireUnusedImages(imageIds);
            throw new InfrastructureException("의견을 DB에 저장하지 못했습니다.");
        }
        if (status == SaveStatus.UNKNOWN) {
            throw new InfrastructureException("의견 저장 결과를 확인하지 못했습니다.");
        }
        return attached;
    }

    public Map<UUID, UUID> feedbackIdsByImage(Collection<UUID> imageIds) {
        if (imageIds.isEmpty()) {
            return Map.of();
        }
        return Stream.concat(
            feedbackJpaRepository.findImageOwners(imageIds).stream(),
            correctionJpaRepository.findImageOwners(imageIds).stream()
        )
            .collect(toMap(ImageOwner::imageId, ImageOwner::feedbackId, (first, ignored) -> first));
    }

    private void requireUnusedImages(List<UUID> imageIds) {
        if (!feedbackIdsByImage(imageIds).isEmpty()) {
            throw new InvalidFeedbackImageIdException();
        }
    }

    public boolean exists(UUID feedbackId) {
        return feedbackJpaRepository.existsById(feedbackId) || correctionJpaRepository.existsById(feedbackId);
    }

    public Feedback findById(UUID feedbackId) {
        return feedbackJpaRepository.findWithImagesById(feedbackId)
            .map(feedback -> feedback.toDomain(zone))
            .or(() -> correctionJpaRepository.findWithImagesById(feedbackId).map(request -> request.toDomain(zone)))
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    public List<Feedback> findAll(FeedbackStatus status, FeedbackSubjectType type) {
        return Stream.concat(
            feedbackJpaRepository.findAllWithImages().stream().map(feedback -> feedback.toDomain(zone)),
            correctionJpaRepository.findAllWithImages().stream().map(request -> request.toDomain(zone))
        )
            .filter(feedback -> feedback.matches(status, type))
            .sorted(
                Comparator.comparing(Feedback::receivedAt).reversed()
                    .thenComparing(Feedback::id, Comparator.reverseOrder())
            )
            .toList();
    }

    public boolean updateStatus(FeedbackStatus expected, Feedback feedback) {
        try {
            return updatedRows(expected, feedback) == 1;
        } catch (RuntimeException exception) {
            throw new InfrastructureException("의견 상태를 DB에 저장하지 못했습니다.", exception);
        }
    }

    private int updatedRows(FeedbackStatus expected, Feedback feedback) {
        return switch (feedback.subject()) {
            case ServiceFeedback ignored -> feedbackJpaRepository.updateStatus(
                feedback.id(),
                expected,
                feedback.status(),
                feedback.statusChangedAt(),
                feedback.completedAt()
            );
            case ProductCorrection ignored -> correctionJpaRepository.updateStatus(
                feedback.id(),
                expected,
                feedback.status(),
                feedback.statusChangedAt(),
                feedback.completedAt()
            );
        };
    }

    private SaveStatus insert(Feedback feedback) {
        try {
            persist(feedback);
            return SaveStatus.SUCCESS;
        } catch (InvalidFeedbackImageIdException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            return verifyCommit(feedback.id());
        }
    }

    private void persist(Feedback feedback) {
        transactionTemplate.executeWithoutResult(status -> {
            List<UUID> imageIds = feedback.images().stream().map(FeedbackImage::id).toList();
            lockImages(imageIds);
            requireUnusedImages(imageIds);
            entityManager.persist(entityOf(feedback));
        });
    }

    private void lockImages(List<UUID> imageIds) {
        imageIds.stream()
            .map(UUID::toString)
            .sorted()
            .forEach(
                imageId -> entityManager.createNativeQuery(IMAGE_LOCK)
                    .setParameter("imageId", imageId)
                    .getSingleResult()
            );
    }

    private static Object entityOf(Feedback feedback) {
        return switch (feedback.subject()) {
            case ServiceFeedback service -> FeedbackEntity.from(feedback, service);
            case ProductCorrection correction -> ProductCorrectionRequestEntity.from(feedback, correction);
        };
    }

    private SaveStatus verifyCommit(UUID feedbackId) {
        try {
            if (exists(feedbackId)) {
                return SaveStatus.SUCCESS;
            }
            return SaveStatus.FAILURE;
        } catch (RuntimeException exception) {
            return SaveStatus.UNKNOWN;
        }
    }

    enum SaveStatus {
        SUCCESS,
        FAILURE,
        UNKNOWN
    }
}
