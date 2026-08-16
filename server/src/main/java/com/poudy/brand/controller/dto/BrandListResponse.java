package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.BrandCounts;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandListResponse(@NotNull List<BrandListItemResponse> items) {

    public static BrandListResponse from(BrandCounts brandCounts) {
        return new BrandListResponse(
                brandCounts.brands().stream()
                        .map(brand -> BrandListItemResponse.from(brand, brandCounts))
                        .toList());
    }
}
