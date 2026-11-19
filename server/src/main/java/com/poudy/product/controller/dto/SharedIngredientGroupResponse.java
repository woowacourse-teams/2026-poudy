package com.poudy.product.controller.dto;

import com.poudy.product.domain.SharedIngredientGroup;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SharedIngredientGroupResponse(
    @NotNull @Schema(description = "성분군 코드", example = "PANTHENOL") String code,
    @NotNull @Schema(description = "성분군 이름", example = "판테놀") String name) {

    public static List<SharedIngredientGroupResponse> listOf(List<SharedIngredientGroup> groups) {
        return groups.stream().map(group -> new SharedIngredientGroupResponse(group.code(), group.name())).toList();
    }
}
