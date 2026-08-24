package com.poudy.brand.domain;

import java.util.Map;

public class BrandCounts {

    private final Map<Long, Long> countsByBrandId;

    public BrandCounts(Map<Long, Long> countsByBrandId) {
        if (countsByBrandId == null) {
            this.countsByBrandId = Map.of();
            return;
        }
        this.countsByBrandId = Map.copyOf(countsByBrandId);
    }

    public long countOf(Long brandId) {
        return countsByBrandId.getOrDefault(brandId, 0L);
    }
}
