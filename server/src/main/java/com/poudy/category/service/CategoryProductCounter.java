package com.poudy.category.service;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.CategoryProductCount;
import java.util.List;

public interface CategoryProductCounter {

    List<CategoryProductCount> countByCategory(Categories categories);
}
