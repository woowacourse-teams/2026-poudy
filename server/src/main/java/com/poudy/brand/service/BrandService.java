package com.poudy.brand.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.BrandProductCount;
import com.poudy.product.domain.BrandProductCounts;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BrandService {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public BrandService(
        BrandRepository brandRepository,
        ProductRepository productRepository,
        CategoryRepository categoryRepository
    ) {
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<BrandProductCount> findBrands() {
        Brands brands = brandRepository.findAll();
        return products().productCountsByBrand(brands.sortedByName());
    }

    public BrandProductCounts findBrandDetail(Long brandId) {
        Brand brand = brandRepository.findById(brandId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));

        return products().brandProductCountsOf(brand, categoryRepository.findAll());
    }

    private Products products() {
        return productRepository.findAll();
    }
}
