package com.poudy.product.repository;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.product.domain.Products;
import org.springframework.stereotype.Repository;

@Repository
public class ProductRepository {

    private final Products products;

    public ProductRepository(ProductJpaRepository productJpaRepository, SnapshotReader snapshotReader) {
        this.products = snapshotReader.read(() -> Products.from(productJpaRepository.findAllProducts()));
    }

    public Products findAll() {
        return products;
    }
}
