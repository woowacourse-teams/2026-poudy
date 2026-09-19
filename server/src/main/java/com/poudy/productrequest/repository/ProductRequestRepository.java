package com.poudy.productrequest.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ProductRequestRepository {

    private final ProductRequestJpaRepository productRequestJpaRepository;
    private final EntityManager entityManager;

    public ProductRequestRepository(
        ProductRequestJpaRepository productRequestJpaRepository,
        EntityManager entityManager
    ) {
        this.productRequestJpaRepository = productRequestJpaRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public void save(ProductRequest request) {
        entityManager.persist(request);
    }

    public boolean updateStatus(ProductRequestStatus expected, ProductRequest request) {
        return productRequestJpaRepository.updateStatus(
            request.requestId(),
            expected,
            request.status(),
            request.statusChangedAt(),
            request.completedAt()
        ) == 1;
    }

    public ProductRequest findById(UUID requestId) {
        return productRequestJpaRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_REQUEST_NOT_FOUND));
    }

    public List<ProductRequest> findAll(ProductRequestStatus status) {
        if (status == null) {
            return productRequestJpaRepository.findAllByOrderByRequestedAtDescRequestIdDesc();
        }
        return productRequestJpaRepository.findAllByStatusOrderByRequestedAtDescRequestIdDesc(status);
    }
}
