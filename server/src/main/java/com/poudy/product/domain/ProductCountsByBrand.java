package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import java.util.List;
import java.util.Map;

public class ProductCountsByBrand {

    private final Map<Long, Long> countsByBrandId;

    public ProductCountsByBrand(Map<Long, Long> countsByBrandId) {
        if (countsByBrandId == null) {
            this.countsByBrandId = Map.of();
            return;
        }
        this.countsByBrandId = Map.copyOf(countsByBrandId);
    }

    private long countOf(Long brandId) {
        return countsByBrandId.getOrDefault(brandId, 0L);
    }

    public List<BrandProductCount> countsOf(List<Brand> brands) {
        return brands.stream()
            .map(brand -> new BrandProductCount(brand, countOf(brand.id())))
            .toList();
    }
}
