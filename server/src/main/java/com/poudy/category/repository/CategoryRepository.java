package com.poudy.category.repository;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.json.JsonDataReader;
import org.springframework.stereotype.Repository;

@Repository
public class CategoryRepository {

    private static final String CATEGORIES_FILE_NAME = "categories.json";

    private final Categories categories;

    public CategoryRepository(JsonDataReader jsonDataReader) {
        this.categories = Categories.from(jsonDataReader.readList(CATEGORIES_FILE_NAME, Category.class));
    }

    public Categories findAll() {
        return categories;
    }
}
