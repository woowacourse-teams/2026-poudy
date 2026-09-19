package com.poudy.productrequest.repository;

import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ProductRequestJpaRepository extends Repository<ProductRequest, UUID> {

    Optional<ProductRequest> findById(UUID id);

    List<ProductRequest> findAllByOrderByRequestedAtDescRequestIdDesc();

    List<ProductRequest> findAllByStatusOrderByRequestedAtDescRequestIdDesc(ProductRequestStatus status);

    @Transactional
    @Modifying
    @Query("update ProductRequest request set request.status = :status, request.statusChangedAt = :statusChangedAt,"
        + " request.completedAt = :completedAt where request.requestId = :id and request.status = :expected")
    int updateStatus(
        @Param("id") UUID id,
        @Param("expected") ProductRequestStatus expected,
        @Param("status") ProductRequestStatus status,
        @Param("statusChangedAt") OffsetDateTime statusChangedAt,
        @Param("completedAt") OffsetDateTime completedAt
    );
}
