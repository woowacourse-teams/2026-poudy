package com.poudy.product.controller.dto;

import com.poudy.ingredient.controller.dto.EffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductIngredientResponse(
        @NotNull @Schema(example = "1005") Long id,
        @NotNull @Schema(example = "글리세린") String koreanName,
        @NotNull @Schema(example = "Glycerin") String englishName,
        @NotNull @Schema(description = "성분 효과 목록") List<EffectResponse> effects,
        @Schema(description = "공개된 함량. 공개하지 않은 성분은 비어 있다") DisclosedAmountResponse disclosedAmount) {
}
