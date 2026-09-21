package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class BrandRepository {
    private final BrandJpaRepository repository;
    public BrandRepository(BrandJpaRepository repository) {
        this.repository = repository;
    }

    public Brands findAll() {
        return Brands.from(repository.findAllByOrderByIdAsc());
    }

    public Optional<Brand> findById(Long id) {
        return repository.findById(id);
    }
}
