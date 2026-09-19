package com.poudy.brand.repository;

import java.util.List;
import org.springframework.data.repository.Repository;

public interface BrandJpaRepository extends Repository<BrandEntity, Long> {

    List<BrandEntity> findAllByOrderByIdAsc();
}
