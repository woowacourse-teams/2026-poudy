package com.poudy.feedback.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.InvalidFeedbackImageIdException;
import com.poudy.feedback.domain.image.PendingImage;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
public class FeedbackRepository {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final String IMAGE_LOCK = "select count(*) from (select pg_advisory_xact_lock(hashtextextended(:imageId, 0))) as image_lock";
    private static final String LISTED = "(select id, created_at, status, subject_type from feedback"
        + " union all select id, created_at, status, 'PRODUCT_CORRECTION' from product_correction_request) listed";
    private static final String IMAGE_OWNERS = "select image_id, feedback_id from feedback_image where image_id in (:imageIds)"
        + " union all select image_id, request_id from product_correction_request_image where image_id in (:imageIds)";
    private static final String STORED = """
        select id, subject_type, page_path, null::bigint as product_id, content, created_at, status, status_changed_at
        from feedback where id in (:ids)
        union all
        select id, 'PRODUCT_CORRECTION' as subject_type, null::text as page_path, product_id,
               content, created_at, status, status_changed_at
        from product_correction_request where id in (:ids)
        """;

    private final S3FeedbackImageRepository imageRepository;
    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate transactionTemplate;
    private final ProductRepository productRepository;
    private final Clock clock;

    public FeedbackRepository(
        S3FeedbackImageRepository imageRepository,
        NamedParameterJdbcTemplate jdbc,
        PlatformTransactionManager transactionManager,
        ProductRepository productRepository,
        Clock clock
    ) {
        this.imageRepository = imageRepository;
        this.jdbc = jdbc;
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
        Feedback attached = feedback.attachImages(pending.stream().map(PendingImage::image).toList());
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
        return jdbc.query(
            IMAGE_OWNERS,
            new MapSqlParameterSource("imageIds", imageIds),
            (rs, row) -> Map.entry(
                rs.getObject("image_id", UUID.class),
                rs.getObject("feedback_id", UUID.class)
            )
        ).stream().collect(toMap(Map.Entry::getKey, Map.Entry::getValue, (first, ignored) -> first));
    }

    private void requireUnusedImages(List<UUID> imageIds) {
        if (!feedbackIdsByImage(imageIds).isEmpty()) {
            throw new InvalidFeedbackImageIdException();
        }
    }

    public boolean exists(UUID feedbackId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists(select 1 from feedback where id = :id
                          union all select 1 from product_correction_request where id = :id)
            """, new MapSqlParameterSource("id", feedbackId), Boolean.class));
    }

    public Feedback findById(UUID feedbackId) {
        return findAllStored(List.of(feedbackId)).stream()
            .findFirst()
            .map(this::toDomain)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    public long count(FeedbackStatus status, FeedbackSubjectType type) {
        Long count = jdbc.queryForObject(
            "select count(*) from " + LISTED + conditionOf(status, type),
            parameters(status, type),
            Long.class
        );
        return Objects.requireNonNull(count);
    }

    public List<Feedback> findPage(FeedbackStatus status, FeedbackSubjectType type, long offset, int size) {
        MapSqlParameterSource parameters = parameters(status, type).addValue("offset", offset).addValue("size", size);
        List<UUID> ids = jdbc.query(
            "select listed.id from " + LISTED + conditionOf(status, type)
                + " order by listed.created_at desc, listed.id desc offset :offset limit :size",
            parameters,
            (rs, row) -> rs.getObject("id", UUID.class)
        );
        return inOrder(ids);
    }

    public List<Feedback> findExpired(OffsetDateTime cutoff, int size) {
        if (size < 1) {
            throw new IllegalArgumentException("조회 개수는 1 이상이어야 합니다.");
        }
        List<UUID> ids = jdbc.query(
            "select listed.id from " + LISTED
                + " where listed.created_at <= :cutoff order by listed.created_at, listed.id limit :size",
            new MapSqlParameterSource().addValue("cutoff", local(cutoff)).addValue("size", size),
            (rs, row) -> rs.getObject("id", UUID.class)
        );
        return inOrder(ids);
    }

    private List<Feedback> inOrder(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<UUID, Feedback> feedbacks = findAllStored(ids).stream()
            .map(this::toDomain)
            .collect(toMap(Feedback::id, Function.identity()));
        return ids.stream().map(feedbacks::get).toList();
    }

    private List<StoredFeedback> findAllStored(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource("ids", ids);
        List<FeedbackRow> rows = jdbc.query(
            STORED,
            parameters,
            (rs, row) -> new FeedbackRow(
                rs.getObject("id", UUID.class),
                rs.getString("subject_type"),
                rs.getString("page_path"),
                rs.getObject("product_id", Long.class),
                rs.getString("content"),
                rs.getObject("created_at", LocalDateTime.class),
                FeedbackStatus.valueOf(rs.getString("status")),
                rs.getObject("status_changed_at", LocalDateTime.class)
            )
        );
        Map<UUID, List<UUID>> imageIds = storedImageIds(ids);
        return rows.stream().map(row -> new StoredFeedback(stored(row), imageIds.getOrDefault(row.id(), List.of())))
            .toList();
    }

    private Map<UUID, List<UUID>> storedImageIds(Collection<UUID> ids) {
        Map<UUID, List<UUID>> result = new LinkedHashMap<>();
        for (String sql : List.of(
            "select feedback_id as owner_id, image_id from feedback_image where feedback_id in (:ids) order by feedback_id, display_order",
            "select request_id as owner_id, image_id from product_correction_request_image where request_id in (:ids) order by request_id, display_order"
        )) {
            jdbc.query(
                sql,
                new MapSqlParameterSource("ids", ids),
                (rs, row) -> Map.entry(
                    rs.getObject("owner_id", UUID.class),
                    rs.getObject("image_id", UUID.class)
                )
            ).forEach(
                image -> result.computeIfAbsent(image.getKey(), ignored -> new ArrayList<>())
                    .add(image.getValue())
            );
        }
        return result;
    }

    private static Feedback stored(FeedbackRow row) {
        OffsetDateTime receivedAt = offset(row.createdAt());
        OffsetDateTime changedAt = offset(row.changedAt());
        OffsetDateTime completedAt = row.status() == FeedbackStatus.COMPLETED ? changedAt : null;
        FeedbackContent content = new FeedbackContent(row.content());
        if (row.type().equals(FeedbackSubjectType.PRODUCT_CORRECTION.name())) {
            return new ProductCorrection(
                row.id(),
                row.productId(),
                null,
                content,
                receivedAt,
                List.of(),
                row.status(),
                changedAt,
                completedAt
            );
        }
        return new ServiceFeedback(
            row.id(),
            FeedbackType.valueOf(row.type()),
            FeedbackPath.from(row.pagePath()),
            content,
            receivedAt,
            List.of(),
            row.status(),
            changedAt,
            completedAt
        );
    }

    public boolean deleteExpired(Feedback feedback, OffsetDateTime cutoff) {
        Integer deleted = transactionTemplate.execute(
            status -> jdbc.update(
                "delete from " + tableOf(feedback) + " where id = :id and created_at <= :cutoff",
                new MapSqlParameterSource().addValue("id", feedback.id()).addValue("cutoff", local(cutoff))
            )
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
        return conditions.isEmpty() ? "" : " where " + String.join(" and ", conditions);
    }

    private static MapSqlParameterSource parameters(FeedbackStatus status, FeedbackSubjectType type) {
        MapSqlParameterSource parameters = new MapSqlParameterSource();
        if (status != null) {
            parameters.addValue("status", status.name());
        }
        if (type != null) {
            parameters.addValue("type", type.name());
        }
        return parameters;
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
            status -> jdbc.update(
                "update " + tableOf(feedback)
                    + " set status = :status, status_changed_at = :changedAt where id = :id and status = :expected",
                new MapSqlParameterSource()
                    .addValue("status", feedback.status().name())
                    .addValue("changedAt", local(feedback.statusChangedAt()))
                    .addValue("id", feedback.id())
                    .addValue("expected", expected.name())
            )
        );
        return Objects.requireNonNullElse(updated, 0);
    }

    private static String tableOf(Feedback feedback) {
        return feedback instanceof ProductCorrection ? "product_correction_request" : "feedback";
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
            insertFeedback(feedback);
            insertImages(feedback);
        });
    }

    private void insertFeedback(Feedback feedback) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
            .addValue("id", feedback.id())
            .addValue("content", feedback.content().value())
            .addValue("createdAt", local(feedback.receivedAt()))
            .addValue("status", feedback.status().name())
            .addValue("changedAt", local(feedback.statusChangedAt()));
        if (feedback instanceof ProductCorrection correction) {
            jdbc.update("""
                insert into product_correction_request (id, product_id, content, created_at, status, status_changed_at)
                values (:id, :productId, :content, :createdAt, :status, :changedAt)
                """, parameters.addValue("productId", correction.productId()));
        } else if (feedback instanceof ServiceFeedback service) {
            jdbc.update(
                """
                    insert into feedback (id, subject_type, content, page_path, created_at, status, status_changed_at)
                    values (:id, :type, :content, :path, :createdAt, :status, :changedAt)
                    """,
                parameters.addValue("type", service.feedbackType().name())
                    .addValue("path", service.path().value().orElse(null))
            );
        }
    }

    private void insertImages(Feedback feedback) {
        String table = feedback instanceof ProductCorrection ? "product_correction_request_image" : "feedback_image";
        String ownerColumn = feedback instanceof ProductCorrection ? "request_id" : "feedback_id";
        for (int order = 0; order < feedback.images().size(); order++) {
            jdbc.update(
                "insert into " + table + " (image_id, " + ownerColumn + ", display_order)"
                    + " values (:imageId, :ownerId, :displayOrder)",
                new MapSqlParameterSource()
                    .addValue("imageId", feedback.images().get(order).id())
                    .addValue("ownerId", feedback.id())
                    .addValue("displayOrder", order)
            );
        }
    }

    private void lockImages(List<UUID> imageIds) {
        imageIds.stream().map(UUID::toString).sorted().forEach(
            imageId -> jdbc.queryForObject(
                IMAGE_LOCK,
                new MapSqlParameterSource("imageId", imageId),
                Long.class
            )
        );
    }

    private Feedback toDomain(StoredFeedback stored) {
        Feedback feedback = stored.feedback();
        List<Long> productIds = feedback instanceof ProductCorrection correction
            ? List.of(correction.productId()) : List.of();
        return feedback.resolve(
            imageRepository.findStored(feedback.id(), stored.imageIds()),
            Products.from(productRepository.findAllById(productIds))
        );
    }

    private static LocalDateTime local(OffsetDateTime value) {
        return value.atZoneSameInstant(SEOUL).toLocalDateTime();
    }

    private static OffsetDateTime offset(LocalDateTime value) {
        return value.atZone(SEOUL).toOffsetDateTime();
    }

    private SaveStatus verifyCommit(UUID feedbackId) {
        try {
            return exists(feedbackId) ? SaveStatus.SUCCESS : SaveStatus.FAILURE;
        } catch (RuntimeException exception) {
            return SaveStatus.UNKNOWN;
        }
    }

    private record FeedbackRow(
        UUID id,
        String type,
        String pagePath,
        Long productId,
        String content,
        LocalDateTime createdAt,
        FeedbackStatus status,
        LocalDateTime changedAt) {
    }

    private record StoredFeedback(Feedback feedback, List<UUID> imageIds) {
    }

    enum SaveStatus {
        SUCCESS,
        FAILURE,
        UNKNOWN
    }
}
