package com.poudy.brand.domain;

import com.poudy.category.domain.Categories;
import java.util.List;

public interface BrandProductCounter {

    List<BrandProductCount> countByBrand(List<Brand> brands);

    BrandProductCounts countByCategory(Brand brand, Categories categories);
}
