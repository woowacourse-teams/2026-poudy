package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfProduct;
import com.poudy.shelf.domain.ShelfUsageStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record GuestShelfItemRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "205") Long productId,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "IN_USE") ShelfUsageStatus usageStatus,
    @Schema(example = "BAD", nullable = true) RatingPreference preference,
    @Schema(example = "1.5", nullable = true) Double moistureLevel,
    @Schema(example = "0.5", nullable = true) Double oilLevel,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "2026-11-06T16:30:00+09:00") OffsetDateTime registeredAt) {

    public ShelfProduct toShelfProduct() {
        return new ShelfProduct(productId, usageStatus, new Rating(preference, moistureLevel, oilLevel), registeredAt);
    }
}
