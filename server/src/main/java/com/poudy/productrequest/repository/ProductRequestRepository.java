package com.poudy.productrequest.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class ProductRequestRepository {

    private final ProductRequestJpaRepository productRequestJpaRepository;

    public ProductRequestRepository(ProductRequestJpaRepository productRequestJpaRepository) {
        this.productRequestJpaRepository = productRequestJpaRepository;
    }

    public void save(ProductRequest request) {
        productRequestJpaRepository.save(ProductRequestEntity.from(request));
    }

    public void update(ProductRequest request) {
        productRequestJpaRepository.save(ProductRequestEntity.from(request));
    }

    public ProductRequest findById(UUID requestId) {
        return productRequestJpaRepository.findById(requestId)
            .map(ProductRequestEntity::toDomain)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_REQUEST_NOT_FOUND));
    }

    public List<ProductRequest> findAll(ProductRequestStatus status) {
        if (status == null) {
            return toDomain(productRequestJpaRepository.findAllByOrderByRequestedAtDescIdDesc());
        }
        return toDomain(productRequestJpaRepository.findAllByStatusOrderByRequestedAtDescIdDesc(status));
    }

    private static List<ProductRequest> toDomain(List<ProductRequestEntity> requests) {
        return requests.stream().map(ProductRequestEntity::toDomain).toList();
    }
}
