package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductPart;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPartResponse(
    @NotNull @Schema(example = "473") Long id,
    @Schema(example = "아쿠아 세럼") String name,
    @NotNull List<ProductIngredientResponse> ingredients,
    @NotNull List<SkinEffectGroupResponse> skinEffectGroups,
    @NotNull List<ExcludeGroupResponse> excludeGroups) {

    public static ProductPartResponse from(ProductDetail detail) {
        ProductPart part = detail.selectedPart();
        if (part == null) {
            return null;
        }

        return new ProductPartResponse(
            part.id(),
            part.name(),
            ProductIngredientResponse.from(part.ingredients().values()),
            SkinEffectGroupResponse.from(part.skinEffectGroups()),
            ExcludeGroupResponse.from(detail.excludeCodes(), part)
        );
    }
}
