package com.poudy.category.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CategoryPathResponse(
        @NotNull @Schema(description = "대분류 ID", example = "1") Long id,
        @NotNull @Schema(description = "대분류 이름", example = "스킨케어") String name,
        @Schema(description = "소분류. 대분류만 지정된 제품은 비어 있다") CategorySummaryResponse child) {
}
