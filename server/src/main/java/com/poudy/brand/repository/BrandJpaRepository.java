package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface BrandJpaRepository extends Repository<Brand, Long> {

    List<Brand> findAllByOrderByIdAsc();

    Optional<Brand> findById(Long id);
}
