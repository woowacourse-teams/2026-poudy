package com.poudy.curation.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record CurationImageBlockResponse(
    @NotNull UUID id,
    @NotNull @Schema(allowableValues = "IMAGE") String type,
    @NotNull @PositiveOrZero @Schema(description = "위 여백 (px)") Integer spacingTop,
    @NotNull @PositiveOrZero @Schema(description = "아래 여백 (px)") Integer spacingBottom,
    @NotNull String imageUrl) implements CurationBlockResponse {
}
