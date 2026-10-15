package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import io.swagger.v3.oas.annotations.media.Schema;

public record RatingResponse(
    @Schema(example = "GOOD", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) RatingPreference preference,
    @Schema(example = "2.5", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Double moistureLevel,
    @Schema(example = "0.5", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Double oilLevel) {

    public static RatingResponse from(Rating rating) {
        return new RatingResponse(rating.preference(), rating.moistureLevel(), rating.oilLevel());
    }
}
