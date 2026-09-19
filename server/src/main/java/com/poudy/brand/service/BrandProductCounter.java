package com.poudy.brand.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandProductCount;
import com.poudy.brand.domain.BrandProductCounts;
import com.poudy.category.domain.Categories;
import java.util.List;

public interface BrandProductCounter {

    List<BrandProductCount> countByBrand(List<Brand> brands);

    BrandProductCounts countByCategory(Brand brand, Categories categories);
}
