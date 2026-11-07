package com.poudy.product.controller.dto;

import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.ConcernGroup;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ConcernGroupResponse(
    @NotNull @Schema(description = "고민 코드", example = "DRYNESS") String code,
    @NotNull @Schema(description = "고민 표시명", example = "건조·당김") String name,
    @NotNull @Valid List<ConcernEffectResponse> effects,
    @NotNull @Valid @Schema(description = "고민에 해당하는 개별 성분·성분군 항목", example = """
        [
          {"type":"INGREDIENT","id":3500,"koreanName":"판테놀"},
          {"type":"INGREDIENT_GROUP","code":"CERAMIDES","name":"세라마이드 계열","ingredients":[
            {"id":7130,"koreanName":"세라마이드엔피"},
            {"id":7131,"koreanName":"세라마이드에이피"}
          ]}
        ]
        """) List<ConcernItemResponse> items) {

    public static List<ConcernGroupResponse> from(List<ConcernGroup> groups, Ingredients ingredients) {
        return groups.stream().map(
            group -> new ConcernGroupResponse(
                group.concern().name(),
                group.concern().displayName(),
                group.effects().stream().map(ConcernEffectResponse::from).toList(),
                group.items().stream().map(item -> ConcernItemResponse.from(item, ingredients)).toList()
            )
        ).toList();
    }
}
