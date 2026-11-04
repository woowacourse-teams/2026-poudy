package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineProducts;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutineProductsRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "[101, 205]") List<@NotNull(message = "INVALID_REQUEST_BODY") Long> morningProductIds,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "[205]") List<@NotNull(message = "INVALID_REQUEST_BODY") Long> eveningProductIds) {

    public RoutineProducts products() {
        return new RoutineProducts(morningProductIds, eveningProductIds);
    }
}
