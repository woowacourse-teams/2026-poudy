package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.GuestRating;
import com.poudy.shelf.domain.RatingPreference;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record GuestRatingRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "205") Long productId,
    @Schema(example = "BAD", nullable = true) RatingPreference preference) {

    public GuestRating toGuestRating() {
        return new GuestRating(productId, preference);
    }
}
