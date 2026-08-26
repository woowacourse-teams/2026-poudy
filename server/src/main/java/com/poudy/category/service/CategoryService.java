package com.poudy.category.service;

import com.poudy.category.domain.Categories;
import com.poudy.category.repository.CategoryRepository;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public Categories findCategories() {
        return categoryRepository.findAll();
    }
}
