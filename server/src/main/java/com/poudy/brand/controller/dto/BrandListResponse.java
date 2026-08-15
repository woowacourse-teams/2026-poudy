package com.poudy.brand.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandListResponse(@NotNull List<BrandListItemResponse> items) {

    public static BrandListResponse sample() {
        return new BrandListResponse(List.of(BrandListItemResponse.sample(BrandResponse.SAMPLE_ID)));
    }
}
