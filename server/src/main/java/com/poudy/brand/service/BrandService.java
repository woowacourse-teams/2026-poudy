package com.poudy.brand.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.CategoryCounts;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.repository.ProductRepository;
import org.springframework.stereotype.Service;

@Service
public class BrandService {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public BrandService(
            BrandRepository brandRepository,
            ProductRepository productRepository,
            CategoryRepository categoryRepository) {
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    public Brands findBrands() {
        return brandRepository.findAll();
    }

    public BrandCounts findBrandCounts() {
        return productRepository.findBrandCounts();
    }

    public Brand findBrand(Long brandId) {
        return brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));
    }

    public BrandDetail findDetail(Long brandId) {
        Brand brand = findBrand(brandId);
        CategoryCounts categoryCounts = new CategoryCounts(
                categoryRepository.findAll(),
                productRepository.countByCategoryIdInBrand(brandId));

        return new BrandDetail(brand, categoryCounts);
    }
}
