package com.poudy.category.domain;

import java.util.List;

public interface CategoryProductCounter {

    List<CategoryProductCount> countByCategory(Categories categories);
}
