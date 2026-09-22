package com.poudy.feedback.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.InvalidFeedbackImageIdException;
import com.poudy.feedback.domain.image.PendingImage;
import com.poudy.product.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
public class FeedbackRepository {

    private static final String IMAGE_LOCK = "select count(*) from (select pg_advisory_xact_lock(hashtextextended(:imageId, 0))) as image_lock";
    private static final String LISTED = "(select id, created_at, status, subject_type from feedback"
        + " union all select id, created_at, status, 'PRODUCT_CORRECTION' from product_correction_request) listed";
    private static final List<Class<? extends Feedback>> TYPES = List.of(
        ServiceFeedback.class,
        ProductCorrection.class
    );
    private static final String IMAGE_OWNERS = "select image_id, feedback_id from feedback_image where image_id in (:imageIds)"
        + " union all select image_id, request_id from product_correction_request_image where image_id in (:imageIds)";

    private final S3FeedbackImageRepository imageRepository;
    private final EntityManager entityManager;
    private final TransactionTemplate transactionTemplate;
    private final ProductRepository productRepository;
    private final Clock clock;

    public FeedbackRepository(
        S3FeedbackImageRepository imageRepository,
        EntityManager entityManager,
        PlatformTransactionManager transactionManager,
        ProductRepository productRepository,
        Clock clock
    ) {
        this.imageRepository = imageRepository;
        this.entityManager = entityManager;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.productRepository = productRepository;
        this.clock = clock;
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
        List<PendingImage> pending = imageRepository.resolve(imageIds, clock.instant());
        Feedback attached = feedback
            .attachImages(pending.stream().map(PendingImage::image).toList());
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
        List<?> owners = entityManager.createNativeQuery(IMAGE_OWNERS)
            .setParameter("imageIds", imageIds)
            .getResultList();
        return owners.stream()
            .map(Object[].class::cast)
            .collect(toMap(owner -> (UUID) owner[0], owner -> (UUID) owner[1], (first, ignored) -> first));
    }

    private void requireUnusedImages(List<UUID> imageIds) {
        if (!feedbackIdsByImage(imageIds).isEmpty()) {
            throw new InvalidFeedbackImageIdException();
        }
    }

    public boolean exists(UUID feedbackId) {
        return TYPES.stream().anyMatch(type -> existsIn(type, feedbackId));
    }

    private boolean existsIn(Class<? extends Feedback> type, UUID feedbackId) {
        return entityManager.createQuery(
            "select count(feedback) from " + type.getSimpleName() + " feedback where feedback.id = :id",
            Long.class
        )
            .setParameter("id", feedbackId)
            .getSingleResult() > 0;
    }

    public Feedback findById(UUID feedbackId) {
        return findAllStored(List.of(feedbackId)).stream()
            .findFirst()
            .map(this::toDomain)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    public long count(FeedbackStatus status, FeedbackSubjectType type) {
        Query query = entityManager.createNativeQuery("select count(*) from " + LISTED + conditionOf(status, type));
        bind(query, status, type);
        return ((Number) query.getSingleResult()).longValue();
    }

    public List<Feedback> findPage(FeedbackStatus status, FeedbackSubjectType type, long offset, int size) {
        Query query = entityManager.createNativeQuery(
            "select listed.id from " + LISTED + conditionOf(status, type)
                + " order by listed.created_at desc, listed.id desc offset :offset limit :size"
        );
        bind(query, status, type);
        query.setParameter("offset", offset);
        query.setParameter("size", size);
        List<UUID> ids = ((List<?>) query.getResultList()).stream().map(UUID.class::cast).toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        return inOrder(ids);
    }

    public List<Feedback> findExpired(OffsetDateTime cutoff, int size) {
        if (size < 1) {
            throw new IllegalArgumentException("조회 개수는 1 이상이어야 합니다.");
        }
        Query query = entityManager.createNativeQuery(
            "select listed.id from " + LISTED
                + " where listed.created_at <= :cutoff order by listed.created_at, listed.id limit :size"
        );
        query.setParameter("cutoff", local(cutoff));
        query.setParameter("size", size);
        List<UUID> ids = ((List<?>) query.getResultList()).stream().map(UUID.class::cast).toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        return inOrder(ids);
    }

    private List<Feedback> inOrder(List<UUID> ids) {
        Map<UUID, Feedback> feedbacks = findAllStored(ids).stream()
            .map(this::toDomain)
            .collect(toMap(Feedback::id, Function.identity()));
        return ids.stream().map(feedbacks::get).toList();
    }

    private List<Feedback> findAllStored(Collection<UUID> ids) {
        return TYPES.stream()
            .flatMap(
                type -> entityManager.createQuery(
                    "select distinct feedback from " + type.getSimpleName()
                        + " feedback left join fetch feedback.imageIdRows where feedback.id in :ids",
                    type
                )
                    .setParameter("ids", ids)
                    .getResultList()
                    .stream()
            )
            .map(Feedback.class::cast)
            .toList();
    }

    public boolean deleteExpired(Feedback feedback, OffsetDateTime cutoff) {
        Integer deleted = transactionTemplate.execute(
            status -> entityManager.createQuery(
                "delete from " + entityNameOf(feedback)
                    + " feedback where feedback.id = :id and feedback.createdAt <= :cutoff"
            )
                .setParameter("id", feedback.id())
                .setParameter("cutoff", local(cutoff))
                .executeUpdate()
        );
        return Objects.requireNonNullElse(deleted, 0) == 1;
    }

    private static String conditionOf(FeedbackStatus status, FeedbackSubjectType type) {
        List<String> conditions = new ArrayList<>();
        if (status != null) {
            conditions.add("listed.status = :status");
        }
        if (type != null) {
            conditions.add("listed.subject_type = :type");
        }
        if (conditions.isEmpty()) {
            return "";
        }
        return " where " + String.join(" and ", conditions);
    }

    private static void bind(Query query, FeedbackStatus status, FeedbackSubjectType type) {
        if (status != null) {
            query.setParameter("status", status.name());
        }
        if (type != null) {
            query.setParameter("type", type.name());
        }
    }

    public boolean updateStatus(FeedbackStatus expected, Feedback feedback) {
        try {
            return updatedRows(expected, feedback) == 1;
        } catch (RuntimeException exception) {
            throw new InfrastructureException("의견 상태를 DB에 저장하지 못했습니다.", exception);
        }
    }

    private int updatedRows(FeedbackStatus expected, Feedback feedback) {
        Integer updated = transactionTemplate.execute(
            status -> entityManager.createQuery(
                "update " + entityNameOf(feedback) + " feedback set feedback.status = :status,"
                    + " feedback.statusChangedAtValue = :statusChangedAt"
                    + " where feedback.id = :id and feedback.status = :expected"
            )
                .setParameter("status", feedback.status())
                .setParameter("statusChangedAt", local(feedback.statusChangedAt()))
                .setParameter("id", feedback.id())
                .setParameter("expected", expected)
                .executeUpdate()
        );
        return Objects.requireNonNullElse(updated, 0);
    }

    private static String entityNameOf(Feedback feedback) {
        return feedback.getClass().getSimpleName();
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
            entityManager.persist(feedback);
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

    private Feedback toDomain(Feedback stored) {
        return stored.resolve(
            imageRepository.findStored(stored.id(), stored.storedImageIds()),
            productRepository.findAll()
        );
    }

    private static LocalDateTime local(OffsetDateTime value) {
        return value.atZoneSameInstant(ZoneId.of("Asia/Seoul")).toLocalDateTime();
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
