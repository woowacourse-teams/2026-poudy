package com.poudy.category.repository;

import com.poudy.category.domain.Categories;
import org.springframework.stereotype.Repository;

@Repository
public class CategoryRepository {

    private final Categories categories;

    public CategoryRepository(CategoryJpaRepository categoryJpaRepository) {
        this.categories = Categories.from(categoryJpaRepository.findAllByOrderByDisplayOrderAsc());
    }

    public Categories findAll() {
        return categories;
    }
}
