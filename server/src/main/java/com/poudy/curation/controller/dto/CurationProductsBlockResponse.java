package com.poudy.curation.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record CurationProductsBlockResponse(
    @NotNull UUID id,
    @NotNull @Schema(allowableValues = "PRODUCTS") String type,
    @NotNull @PositiveOrZero @Schema(description = "위 여백 (px)") Integer spacingTop,
    @NotNull @PositiveOrZero @Schema(description = "아래 여백 (px)") Integer spacingBottom,
    @NotNull @Size(min = 1) List<CurationProductResponse> products) implements CurationBlockResponse {
}
