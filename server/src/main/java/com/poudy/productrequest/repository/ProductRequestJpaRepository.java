package com.poudy.productrequest.repository;

import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ProductRequestJpaRepository extends Repository<ProductRequest, UUID> {

    boolean existsById(UUID id);

    Optional<ProductRequest> findById(UUID id);

    List<ProductRequest> findAllByOrderByCreatedAtDescRequestIdDesc();

    List<ProductRequest> findAllByStatusOrderByCreatedAtDescRequestIdDesc(ProductRequestStatus status);

    @Transactional
    @Modifying
    @Query("update ProductRequest request set request.status = :status, request.statusChangedAt = :statusChangedAt"
        + " where request.requestId = :id and request.status = :expected")
    int updateStatus(
        @Param("id") UUID id,
        @Param("expected") ProductRequestStatus expected,
        @Param("status") ProductRequestStatus status,
        @Param("statusChangedAt") LocalDateTime statusChangedAt
    );
}
