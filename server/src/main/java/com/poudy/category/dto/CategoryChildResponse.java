package com.poudy.category.dto;

import jakarta.validation.constraints.NotNull;

public record CategoryChildResponse(@NotNull Long id, @NotNull String name, @NotNull Long productCount) {
}
