package com.poudy.excludecode.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.controller.dto.IngredientSummaryResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExcludeCodeResponse(
        @NotNull @Schema(description = "성분군을 구분하는 값", example = "HARSH_PRESERVATIVES") ExcludeCode code,
        @NotNull @Schema(description = "빠른 필터에 표시할 이름", example = "자극성 방부제 제외") String name,
        @NotNull @Schema(description = "이 성분군에 속한 성분. 제품 조회의 excludeIngredientIds 로 펼쳐 보낸다") List<IngredientSummaryResponse> ingredients) {
}
