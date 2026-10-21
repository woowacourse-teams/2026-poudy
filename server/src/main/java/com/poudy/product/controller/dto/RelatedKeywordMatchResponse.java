package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record RelatedKeywordMatchResponse(
    @NotNull @PositiveOrZero @Schema(example = "3") Integer startIndex,
    @NotNull @Positive @Schema(example = "5", minimum = "1") Integer endIndexExclusive) {
}
