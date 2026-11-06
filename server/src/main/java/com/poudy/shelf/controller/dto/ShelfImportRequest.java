package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.ShelfProduct;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ShelfImportRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Size(max = 100, message = "INVALID_REQUEST_BODY") List<@Valid @NotNull(message = "INVALID_REQUEST_BODY") GuestShelfItemRequest> items) {

    public List<ShelfProduct> shelfProducts() {
        return items.stream().map(GuestShelfItemRequest::toShelfProduct).toList();
    }
}
