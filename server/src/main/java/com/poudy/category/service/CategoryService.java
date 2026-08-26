package com.poudy.category.service;

import com.poudy.category.repository.CategoryRepository;
import com.poudy.product.domain.CategoryProductCount;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    public List<CategoryProductCount> findCategories() {
        return productRepository.findAll().productCountsByCategory(categoryRepository.findAll());
    }
}
