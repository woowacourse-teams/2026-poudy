package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductDetail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExcludeGroupResponse(
    @NotNull @Schema(description = "제외 성분군 이름", example = "향료/알레르기 성분") String name,
    @NotNull @Schema(description = "제품의 해당 성분군 포함 여부", example = "false") Boolean contains) {

    public static List<ExcludeGroupResponse> from(ProductDetail detail) {
        return detail.excludeCodes().stream()
            .map(group -> new ExcludeGroupResponse(group.displayName(), detail.containsIngredientFrom(group)))
            .toList();
    }
}
