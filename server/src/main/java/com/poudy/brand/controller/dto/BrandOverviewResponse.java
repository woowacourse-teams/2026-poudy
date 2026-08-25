package com.poudy.brand.controller.dto;

import com.poudy.product.domain.BrandProductCount;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandOverviewResponse(@NotNull List<BrandSummaryResponse> items) {

    public static BrandOverviewResponse from(List<BrandProductCount> brandProductCounts) {
        return new BrandOverviewResponse(
                brandProductCounts.stream()
                        .map(BrandSummaryResponse::from)
                        .toList());
    }
}
