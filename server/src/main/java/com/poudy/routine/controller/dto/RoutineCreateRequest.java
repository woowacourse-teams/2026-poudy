package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineMemo;
import com.poudy.routine.domain.RoutineName;
import com.poudy.routine.domain.RoutineProducts;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutineCreateRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "저녁 진정 루틴") String name,
    @Schema(nullable = true, example = "트러블이 올라온 날 저녁에 써요.") String memo,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "false") Boolean isPublic,
    @Schema(nullable = true, example = "[101, 205]") List<@NotNull(message = "INVALID_REQUEST_BODY") Long> morningProductIds,
    @Schema(nullable = true, example = "[]") List<@NotNull(message = "INVALID_REQUEST_BODY") Long> eveningProductIds) {

    public RoutineName routineName() {
        return new RoutineName(name);
    }

    public RoutineMemo routineMemo() {
        return new RoutineMemo(memo);
    }

    public RoutineProducts products() {
        return new RoutineProducts(orEmpty(morningProductIds), orEmpty(eveningProductIds));
    }

    private static List<Long> orEmpty(List<Long> productIds) {
        if (productIds == null) {
            return List.of();
        }
        return productIds;
    }
}
