package com.poudy.product.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandProductCount;
import com.poudy.brand.domain.BrandProductCounter;
import com.poudy.brand.domain.BrandProductCounts;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.category.domain.CategoryProductCounter;
import com.poudy.ingredient.domain.IngredientUsage;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProductCountService implements BrandProductCounter, CategoryProductCounter, IngredientUsage {

    private final ProductRepository productRepository;

    public ProductCountService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public List<BrandProductCount> countByBrand(List<Brand> brands) {
        return productRepository.productCountsByBrand(brands);
    }

    @Override
    public BrandProductCounts countByCategory(Brand brand, Categories categories) {
        return productRepository.brandProductCountsOf(brand, categories);
    }

    @Override
    public List<CategoryProductCount> countByCategory(Categories categories) {
        return productRepository.productCountsByCategory(categories);
    }

    @Override
    public long countProductsContaining(Long ingredientId) {
        return productRepository.countContainingIngredient(ingredientId);
    }
}
