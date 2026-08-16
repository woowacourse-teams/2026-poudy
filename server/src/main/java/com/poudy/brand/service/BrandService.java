package com.poudy.brand.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
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

    public Brand findBrand(Long brandId) {
        return brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));
    }
}
