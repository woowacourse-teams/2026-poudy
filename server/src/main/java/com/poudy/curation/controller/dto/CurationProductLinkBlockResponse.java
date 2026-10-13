package com.poudy.curation.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record CurationProductLinkBlockResponse(
    @NotNull UUID id,
    @NotNull @Schema(allowableValues = "PRODUCT_LINK") String type,
    @NotNull @PositiveOrZero @Schema(description = "위 여백 (px)") Integer spacingTop,
    @NotNull @PositiveOrZero @Schema(description = "아래 여백 (px)") Integer spacingBottom,
    @NotBlank @Schema(description = "일반 텍스트 문구, 최대 100 유니코드 문자") String label,
    @NotNull CurationProductLinkQueryResponse query) implements CurationBlockResponse {
}
