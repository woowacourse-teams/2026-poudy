package com.poudy.storage.controller;

import com.poudy.product.controller.dto.ProductResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record StorageResponse(
        @NotNull @Schema(description = "요청한 ID 순서대로 담긴 제품. 찾지 못한 ID 는 빠진다") List<ProductResponse> items) {

    public static StorageResponse sample(List<Long> productIds) {
        return new StorageResponse(productIds.stream().map(ProductResponse::sample).toList());
    }
}
