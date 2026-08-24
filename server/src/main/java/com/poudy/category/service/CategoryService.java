package com.poudy.category.service;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.CategoryCounts;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.product.repository.ProductRepository;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    public CategoryCounts findCategories() {
        Categories categories = categoryRepository.findAll();
        Map<Long, Long> productCountsByCategoryId = productRepository.countByCategoryId();

        return new CategoryCounts(categories, productCountsByCategoryId);
    }
}
