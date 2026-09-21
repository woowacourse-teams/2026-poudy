package com.poudy.category.repository;

import com.poudy.category.domain.Categories;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class CategoryRepository {
    private final CategoryJpaRepository repository;
    public CategoryRepository(CategoryJpaRepository repository) {
        this.repository = repository;
    }

    public Categories findAll() {
        return Categories.from(repository.findAllByOrderByDisplayOrderAsc());
    }

}
