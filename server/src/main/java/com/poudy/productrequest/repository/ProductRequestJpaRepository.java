package com.poudy.productrequest.repository;

import com.poudy.productrequest.domain.ProductRequestStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface ProductRequestJpaRepository extends Repository<ProductRequestEntity, UUID> {

    ProductRequestEntity save(ProductRequestEntity request);

    Optional<ProductRequestEntity> findById(UUID id);

    List<ProductRequestEntity> findAllByOrderByRequestedAtDescIdDesc();

    List<ProductRequestEntity> findAllByStatusOrderByRequestedAtDescIdDesc(ProductRequestStatus status);
}
