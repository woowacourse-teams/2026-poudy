package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class BrandRepository {

    private final Brands brands;

    public BrandRepository(BrandJpaRepository brandJpaRepository) {
        this.brands = Brands.from(
            brandJpaRepository.findAllByOrderByIdAsc().stream()
                .map(BrandEntity::toDomain)
                .toList()
        );
    }

    public Brands findAll() {
        return brands;
    }

    public Optional<Brand> findById(Long id) {
        return brands.findById(id);
    }
}
