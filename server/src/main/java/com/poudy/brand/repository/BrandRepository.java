package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.common.persistence.SnapshotReader;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class BrandRepository {

    private final Brands brands;

    public BrandRepository(BrandJpaRepository brandJpaRepository, SnapshotReader snapshotReader) {
        this.brands = snapshotReader.read(() -> Brands.from(brandJpaRepository.findAllByOrderByIdAsc()));
    }

    public Brands findAll() {
        return brands;
    }

    public Optional<Brand> findById(Long id) {
        return brands.findById(id);
    }
}
