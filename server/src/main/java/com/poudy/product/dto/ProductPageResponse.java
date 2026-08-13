package com.poudy.product.dto;

import com.poudy.common.dto.PaginationResponse;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPageResponse(@NotNull List<ProductResponse> items, @NotNull PaginationResponse pagination) {
}
