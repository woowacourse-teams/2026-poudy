package com.poudy.brand.domain;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public class BrandCounts {

    private final Brands brands;
    private final Map<Long, Long> productCounts;

    public BrandCounts(Brands brands, Map<Long, Long> countsByBrandId) {
        this.brands = Objects.requireNonNull(brands);
        this.productCounts = Map.copyOf(Objects.requireNonNullElse(countsByBrandId, Map.of()));
        validateProductCountsBelongToBrands();
    }

    public List<Brand> brands() {
        return brands.sortedByName();
    }

    public long productCountOf(Brand brand) {
        return productCounts.getOrDefault(brand.id(), 0L);
    }

    private void validateProductCountsBelongToBrands() {
        Set<Long> brandIds = brands().stream().map(Brand::id).collect(Collectors.toUnmodifiableSet());
        if (!brandIds.containsAll(productCounts.keySet())) {
            throw new IllegalArgumentException("제품은 존재하는 브랜드에 속해야 합니다.");
        }
    }
}
