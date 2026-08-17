package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductCountResponse(@NotNull @Schema(example = "127") Long count) {

    public static ProductCountResponse from(long count) {
        return new ProductCountResponse(count);
    }
}
