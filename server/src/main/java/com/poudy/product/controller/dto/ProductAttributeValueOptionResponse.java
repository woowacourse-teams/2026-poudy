package com.poudy.product.controller.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductAttributeValueOptionResponse(
    @NotNull String valueCode,
    @NotNull String name,
    @NotNull @Min(0) Long productCount) {
}
