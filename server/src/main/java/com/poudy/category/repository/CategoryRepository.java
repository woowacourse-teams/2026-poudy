package com.poudy.category.repository;

import com.poudy.category.domain.Categories;
import com.poudy.common.persistence.SnapshotReader;
import org.springframework.stereotype.Repository;

@Repository
public class CategoryRepository {

    private final Categories categories;

    public CategoryRepository(CategoryJpaRepository categoryJpaRepository, SnapshotReader snapshotReader) {
        this.categories = snapshotReader
            .read(() -> Categories.from(categoryJpaRepository.findAllByOrderByDisplayOrderAsc()));
    }

    public Categories findAll() {
        return categories;
    }
}
