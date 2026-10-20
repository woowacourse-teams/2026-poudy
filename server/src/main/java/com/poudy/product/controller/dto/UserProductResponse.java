package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record UserProductResponse(
    @NotNull @Schema(description = "저장함에 담았는지 여부") Boolean wishlisted,
    @NotNull @Schema(description = "선반에 담았는지 여부") Boolean shelved) {
}
