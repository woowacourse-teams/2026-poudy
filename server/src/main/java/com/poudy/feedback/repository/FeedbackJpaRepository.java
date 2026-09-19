package com.poudy.feedback.repository;

import com.poudy.feedback.domain.FeedbackStatus;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface FeedbackJpaRepository extends Repository<FeedbackEntity, UUID> {

    boolean existsById(UUID id);

    @Query("select feedback from FeedbackEntity feedback left join fetch feedback.images where feedback.id = :id")
    Optional<FeedbackEntity> findWithImagesById(@Param("id") UUID id);

    @Query("select distinct feedback from FeedbackEntity feedback left join fetch feedback.images where feedback.id in :ids")
    List<FeedbackEntity> findAllWithImagesByIdIn(@Param("ids") Collection<UUID> ids);

    @Query("select new com.poudy.feedback.repository.ImageOwner(image.imageId, feedback.id)"
        + " from FeedbackEntity feedback join feedback.images image where image.imageId in :imageIds")
    List<ImageOwner> findImageOwners(@Param("imageIds") Collection<UUID> imageIds);

    @Transactional
    @Modifying
    @Query("update FeedbackEntity feedback set feedback.status = :status,"
        + " feedback.statusChangedAt = :statusChangedAt, feedback.completedAt = :completedAt where feedback.id = :id and feedback.status = :expected")
    int updateStatus(
        @Param("id") UUID id,
        @Param("expected") FeedbackStatus expected,
        @Param("status") FeedbackStatus status,
        @Param("statusChangedAt") OffsetDateTime statusChangedAt,
        @Param("completedAt") OffsetDateTime completedAt
    );

    @Transactional
    @Modifying
    @Query("delete from FeedbackEntity feedback where feedback.id = :id and feedback.receivedAt <= :cutoff")
    int deleteExpired(@Param("id") UUID id, @Param("cutoff") OffsetDateTime cutoff);
}
