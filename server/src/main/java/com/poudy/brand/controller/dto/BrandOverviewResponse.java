package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.BrandSummary;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandOverviewResponse(@NotNull List<BrandSummaryResponse> items) {

    public static BrandOverviewResponse from(List<BrandSummary> brandSummaries) {
        return new BrandOverviewResponse(
                brandSummaries.stream()
                        .map(BrandSummaryResponse::from)
                        .toList());
    }
}
