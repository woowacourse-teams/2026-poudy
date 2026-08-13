package com.poudy.product.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPageResponse(@NotNull List<ProductResponse> items, @NotNull Integer page, @NotNull Integer size,
        @NotNull Boolean hasNext) {
}
