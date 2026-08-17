package com.poudy.product.controller.dto;

import com.poudy.product.domain.SkinEffectGroup;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectGroupResponse(
        @NotNull @Schema(description = "피부 작용 ID", example = "108") Long id,
        @NotNull @Schema(description = "피부 작용 이름", example = "수분 공급 관련") String name,
        @NotNull @ArraySchema(schema = @Schema(example = "1012")) List<Long> ingredientIds) {

    public static List<SkinEffectGroupResponse> from(List<SkinEffectGroup> groups) {
        return groups.stream()
                .map(
                        group -> new SkinEffectGroupResponse(
                                group.effect().id(),
                                group.effect().displayName(),
                                group.ingredientIds()))
                .toList();
    }
}
