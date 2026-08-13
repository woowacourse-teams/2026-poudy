package com.poudy.product.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BenefitResponse(@NotNull Long id, @NotNull String name, @NotNull String color,
        @NotNull List<Long> ingredientIds) {
}
