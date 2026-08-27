package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.domain.IngredientMatchField;
import com.poudy.ingredient.domain.MatchedIngredient;
import com.poudy.search.domain.MatchRange;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record IngredientSuggestionMatchResponse(
    @NotNull @Schema(description = "검색어가 일치한 성분 필드") IngredientMatchField field,
    @NotNull @Schema(description = "검색어가 일치한 원문", example = "가지추출물") String text,
    @NotNull @PositiveOrZero @Schema(description = "일치 구간의 UTF-16 시작 인덱스", example = "0") Integer startIndex,
    @NotNull @Positive @Schema(description = "일치 구간의 UTF-16 종료 제외 인덱스", example = "2") Integer endIndexExclusive) {

    public static IngredientSuggestionMatchResponse from(MatchedIngredient matched) {
        MatchRange range = matched.textMatch().range();
        return new IngredientSuggestionMatchResponse(
            matched.field(),
            matched.textMatch().text(),
            range.startIndex(),
            range.endIndexExclusive()
        );
    }
}
