package com.poudy.category.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryResponse(@NotNull Long id, @NotNull String name, @NotNull List<CategoryChildResponse> children,
        @NotNull Long productCount) {
}
