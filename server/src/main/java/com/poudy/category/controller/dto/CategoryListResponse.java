package com.poudy.category.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryListResponse(@NotNull List<CategoryResponse> items) {

    public static CategoryListResponse sample() {
        return new CategoryListResponse(CategoryResponse.samples());
    }
}
