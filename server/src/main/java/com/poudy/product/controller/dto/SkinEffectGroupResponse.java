package com.poudy.product.controller.dto;

import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import com.poudy.product.domain.SkinEffectGroup;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectGroupResponse(
    @NotNull @Schema(description = "피부 작용 ID", example = "HYDRATION_RELATED") String id,
    @NotNull @Schema(example = "HYDRATION_RELATED") String code,
    @NotNull @Schema(description = "피부 작용 이름", example = "피부 수분 관련") String name,
    @NotNull @ArraySchema(schema = @Schema(example = "1012")) List<Long> ingredientIds,
    @NotNull List<SkinEffectItemResponse> items) {

    public static List<SkinEffectGroupResponse> from(
        List<SkinEffectGroup> groups,
        IngredientGroupCatalog ingredientGroups,
        Ingredients ingredients
    ) {
        return groups.stream()
            .map(
                group -> new SkinEffectGroupResponse(
                    group.effect().id(),
                    group.effect().code(),
                    group.effect().displayName(),
                    group.ingredientIds(),
                    SkinEffectItemResponse.from(ingredientGroups.bundle(group.ingredientIds()), ingredients)
                )
            )
            .toList();
    }
}
