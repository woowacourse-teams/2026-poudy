package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.BrandCounts;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandOverviewResponse(@NotNull List<BrandSummaryResponse> items) {

    public static BrandOverviewResponse from(BrandCounts brandCounts) {
        return new BrandOverviewResponse(
                brandCounts.brands().stream()
                        .map(brand -> BrandSummaryResponse.from(brand, brandCounts))
                        .toList());
    }
}
