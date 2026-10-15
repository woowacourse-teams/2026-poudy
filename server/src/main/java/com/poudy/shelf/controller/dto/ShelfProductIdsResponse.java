package com.poudy.shelf.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ShelfProductIdsResponse(@NotNull List<Long> productIds) {
}
