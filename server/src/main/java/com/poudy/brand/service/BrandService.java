package com.poudy.brand.service;

import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.product.repository.ProductRepository;
import org.springframework.stereotype.Service;

@Service
public class BrandService {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    public BrandService(BrandRepository brandRepository, ProductRepository productRepository) {
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
    }

    public BrandCounts findBrands() {
        return new BrandCounts(brandRepository.findAll(), productRepository.countByBrandId());
    }
}
