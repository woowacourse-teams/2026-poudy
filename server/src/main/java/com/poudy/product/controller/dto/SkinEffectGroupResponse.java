package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectGroupResponse(
        @NotNull @Schema(description = "피부 작용 ID", example = "21") Long id,
        @NotNull @Schema(description = "피부 작용 이름", example = "피부 장벽 관련") String name,
        @NotNull @Schema(description = "화면에서 이 피부 작용을 구분하는 색", example = "#4CAF50") String color,
        @NotNull @ArraySchema(schema = @Schema(example = "1005")) List<Long> ingredientIds) {

    public static List<SkinEffectGroupResponse> samples() {
        return List.of(new SkinEffectGroupResponse(21L, "피부 장벽 관련", "#4CAF50", List.of(1005L)));
    }
}
