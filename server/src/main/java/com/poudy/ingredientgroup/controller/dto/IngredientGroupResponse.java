package com.poudy.ingredientgroup.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.poudy.ingredientgroup.domain.IngredientGroupDetail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientGroupResponse(
    @NotNull @Schema(example = "CERAMIDES") String code,
    @NotNull @Schema(example = "세라마이드") String name,
    @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(example = "Ceramides") String englishName,
    @NotNull @Schema(example = "피부 장벽을 구성하는 지질 성분으로 수분 손실을 막아요.") String description,
    @NotNull List<IngredientGroupMemberResponse> ingredients) {

    public static IngredientGroupResponse from(IngredientGroupDetail detail) {
        return new IngredientGroupResponse(
            detail.code(),
            detail.name(),
            detail.englishName(),
            detail.description(),
            IngredientGroupMemberResponse.from(detail.members())
        );
    }
}
