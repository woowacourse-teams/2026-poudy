package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.GuestRating;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record GuestIngredientAnalysisRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Size(max = 100, message = "INVALID_REQUEST_BODY") List<@Valid @NotNull(message = "INVALID_REQUEST_BODY") GuestRatingRequest> items) {

    public List<GuestRating> ratings() {
        return items.stream().map(GuestRatingRequest::toGuestRating).toList();
    }
}
