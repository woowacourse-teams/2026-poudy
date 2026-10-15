package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfUsageStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ShelfProductUpdateRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "USED") ShelfUsageStatus usageStatus,
    @Schema(example = "BAD", nullable = true) RatingPreference preference,
    @Schema(example = "1.5", nullable = true) Double moistureLevel,
    @Schema(example = "2", nullable = true) Double oilLevel) {

    public Rating rating() {
        return new Rating(preference, moistureLevel, oilLevel);
    }
}
