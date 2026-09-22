package com.poudy.feedback.repository;

import com.poudy.feedback.domain.FeedbackStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ProductCorrectionRequestJpaRepository extends Repository<ProductCorrectionRequestEntity, UUID> {

    boolean existsById(UUID id);

    @Query("select request from ProductCorrectionRequestEntity request left join fetch request.images where request.id = :id")
    Optional<ProductCorrectionRequestEntity> findWithImagesById(@Param("id") UUID id);

    @Query("select distinct request from ProductCorrectionRequestEntity request left join fetch request.images where request.id in :ids")
    List<ProductCorrectionRequestEntity> findAllWithImagesByIdIn(@Param("ids") Collection<UUID> ids);

    @Query("select new com.poudy.feedback.repository.ImageOwner(image.imageId, request.id)"
        + " from ProductCorrectionRequestEntity request join request.images image where image.imageId in :imageIds")
    List<ImageOwner> findImageOwners(@Param("imageIds") Collection<UUID> imageIds);

    @Transactional
    @Modifying
    @Query("update ProductCorrectionRequestEntity request set request.status = :status,"
        + " request.statusChangedAt = :statusChangedAt where request.id = :id and request.status = :expected")
    int updateStatus(
        @Param("id") UUID id,
        @Param("expected") FeedbackStatus expected,
        @Param("status") FeedbackStatus status,
        @Param("statusChangedAt") LocalDateTime statusChangedAt
    );

    @Transactional
    @Modifying
    @Query("delete from ProductCorrectionRequestEntity request where request.id = :id and request.createdAt <= :cutoff")
    int deleteExpired(@Param("id") UUID id, @Param("cutoff") LocalDateTime cutoff);
}
