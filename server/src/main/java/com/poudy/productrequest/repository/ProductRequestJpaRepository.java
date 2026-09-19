package com.poudy.productrequest.repository;

import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface ProductRequestJpaRepository extends Repository<ProductRequest, UUID> {

    ProductRequest save(ProductRequest request);

    Optional<ProductRequest> findById(UUID id);

    List<ProductRequest> findAllByOrderByRequestedAtDescRequestIdDesc();

    List<ProductRequest> findAllByStatusOrderByRequestedAtDescRequestIdDesc(ProductRequestStatus status);
}
