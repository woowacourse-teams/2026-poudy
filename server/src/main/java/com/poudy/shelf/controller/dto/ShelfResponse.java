package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.Shelf;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ShelfResponse(@NotNull List<ShelfUsageResponse> usages, @NotNull List<ShelfProductResponse> items) {

    public static ShelfResponse from(Shelf shelf) {
        return new ShelfResponse(
            ShelfUsageResponse.from(shelf),
            shelf.items().stream().map(ShelfProductResponse::from).toList()
        );
    }
}
