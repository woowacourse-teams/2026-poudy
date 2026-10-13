package com.poudy.product.controller.dto;

import com.poudy.excludecode.domain.ExcludeCodeGroup;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientCautionResponse(
    @NotNull @Schema(description = "이 성분이 속한 주의 성분 기준의 코드", example = "FRAGRANCE_ALLERGENS") String code,
    @NotNull @Schema(description = "주의 태그에 표시할 짧은 이름", example = "향료") String label) {

    public static List<IngredientCautionResponse> from(List<ExcludeCodeGroup> groups) {
        return groups.stream()
            .map(group -> new IngredientCautionResponse(group.codeValue(), group.tagName()))
            .toList();
    }
}
