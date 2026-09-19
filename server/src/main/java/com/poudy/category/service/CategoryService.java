package com.poudy.category.service;

import com.poudy.category.domain.CategoryProductCount;
import com.poudy.category.repository.CategoryRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryProductCounter productCounter;

    public CategoryService(CategoryRepository categoryRepository, CategoryProductCounter productCounter) {
        this.categoryRepository = categoryRepository;
        this.productCounter = productCounter;
    }

    public List<CategoryProductCount> findCategories() {
        return productCounter.countByCategory(categoryRepository.findAll());
    }
}
