package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectGroupResponse(
        @NotNull @Schema(description = "피부 작용 ID", example = "105") Long id,
        @NotNull @Schema(description = "피부 작용 이름", example = "피부 장벽 관련") String name,
        @NotNull @ArraySchema(schema = @Schema(example = "1012")) List<Long> ingredientIds) {

    public static List<SkinEffectGroupResponse> samples() {
        return List.of(new SkinEffectGroupResponse(108L, "수분 공급 관련", List.of(1012L)));
    }
}
