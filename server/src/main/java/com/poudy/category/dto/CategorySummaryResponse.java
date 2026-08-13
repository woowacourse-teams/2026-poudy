package com.poudy.category.dto;

import jakarta.validation.constraints.NotNull;

public record CategorySummaryResponse(@NotNull Long id, @NotNull String name) {
}
