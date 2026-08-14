package com.poudy.excludecode.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.controller.dto.IngredientSummaryResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExcludeCodeResponse(
        @NotNull @Schema(description = "성분군을 구분하는 값", example = "HARSH_PRESERVATIVES") ExcludeCode code,
        @NotNull @Schema(description = "빠른 필터에 표시할 이름", example = "자극성 방부제 제외") String name,
        @NotNull @Schema(description = "이 성분군에 속한 성분. 성분군에 무엇이 속하는지 보여주는 데 쓴다") List<IngredientSummaryResponse> ingredients,
        @NotNull @Schema(description = "성분군 설명", example = "자극을 유발할 수 있는 방부제 성분을 제외합니다.") String description) {
}
