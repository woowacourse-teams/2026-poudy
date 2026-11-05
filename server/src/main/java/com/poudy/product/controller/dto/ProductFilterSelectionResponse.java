package com.poudy.product.controller.dto;

import jakarta.validation.constraints.NotNull;

public record ProductFilterSelectionResponse(@NotNull Long id, @NotNull String name) {
}
