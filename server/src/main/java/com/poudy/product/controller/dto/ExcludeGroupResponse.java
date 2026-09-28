package com.poudy.product.controller.dto;

import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.product.domain.ProductPart;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExcludeGroupResponse(
    @NotNull @Schema(example = "향료/알레르기 성분") String name,
    @NotNull @Schema(example = "false") Boolean contains) {

    public static List<ExcludeGroupResponse> from(List<ExcludeCodeGroup> excludeCodes, ProductPart part) {
        return excludeCodes.stream()
            .map(group -> new ExcludeGroupResponse(group.displayName(), part.containsIngredientFrom(group)))
            .toList();
    }
}
