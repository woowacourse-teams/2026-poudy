package com.poudy.brand.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandSummary;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.ProductCountsByBrand;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BrandService {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    public BrandService(BrandRepository brandRepository, ProductRepository productRepository) {
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
    }

    public List<BrandSummary> findBrands() {
        Brands brands = brandRepository.findAll();
        ProductCountsByBrand productCounts = productRepository.findProductCountsByBrand();
        return productCounts.summariesOf(brands.sortedByName());
    }

    public Brand findBrand(Long brandId) {
        return brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));
    }
}
