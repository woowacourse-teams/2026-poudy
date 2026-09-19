package com.poudy.brand.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandProductCount;
import com.poudy.brand.domain.BrandProductCounts;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BrandService {

    private final BrandRepository brandRepository;
    private final BrandProductCounter productCounter;
    private final CategoryRepository categoryRepository;

    public BrandService(
        BrandRepository brandRepository,
        BrandProductCounter productCounter,
        CategoryRepository categoryRepository
    ) {
        this.brandRepository = brandRepository;
        this.productCounter = productCounter;
        this.categoryRepository = categoryRepository;
    }

    public List<BrandProductCount> findBrands() {
        Brands brands = brandRepository.findAll();
        return productCounter.countByBrand(brands.sortedByName());
    }

    public BrandProductCounts findBrandDetail(Long brandId) {
        Brand brand = brandRepository.findById(brandId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));

        return productCounter.countByCategory(brand, categoryRepository.findAll());
    }
}
