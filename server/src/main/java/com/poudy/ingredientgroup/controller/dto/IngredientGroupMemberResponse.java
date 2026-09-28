package com.poudy.ingredientgroup.controller.dto;

import com.poudy.ingredientgroup.domain.IngredientGroupMember;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientGroupMemberResponse(
    @NotNull @Schema(example = "7130") Long id,
    @NotNull @Schema(example = "세라마이드엔피") String koreanName,
    @Schema(example = "Ceramide NP") String englishName) {

    public static List<IngredientGroupMemberResponse> from(List<IngredientGroupMember> members) {
        return members.stream()
            .map(member -> new IngredientGroupMemberResponse(member.id(), member.koreanName(), member.englishName()))
            .toList();
    }
}
