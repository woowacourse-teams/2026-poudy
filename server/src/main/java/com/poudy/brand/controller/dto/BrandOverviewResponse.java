package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.Brands;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandOverviewResponse(@NotNull List<BrandSummaryResponse> items) {

    public static BrandOverviewResponse from(Brands brands, BrandCounts brandCounts) {
        return new BrandOverviewResponse(
                brands.sortedByName().stream()
                        .map(brand -> BrandSummaryResponse.from(brand, brandCounts))
                        .toList());
    }
}
