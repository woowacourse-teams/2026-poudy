package com.poudy.skintype.controller.dto;

import com.poudy.skintype.domain.SkinChoice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.Arrays;
import java.util.List;

public record SkinOptionsResponse(
    @NotNull @Schema(description = "표시 순서대로 정렬된 전체 피부 선택지. 건성, 지성, 복합성, 민감성 순서이며 제품 수는 포함하지 않는다") List<SkinChoiceResponse> items) {

    public static SkinOptionsResponse from() {
        return new SkinOptionsResponse(Arrays.stream(SkinChoice.values()).map(SkinChoiceResponse::from).toList());
    }
}
