package com.poudy.skintype.controller.dto;

import com.poudy.skintype.domain.SkinChoice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.Arrays;
import java.util.List;

public record SkinTypesResponse(
    @NotNull @Schema(description = "표시 순서대로 정렬된 피부 선택지 전체. 건성, 지성, 복합성 뒤에 민감성이 온다") List<SkinChoiceResponse> items) {

    public static SkinTypesResponse from() {
        return new SkinTypesResponse(
            Arrays.stream(SkinChoice.values())
                .map(SkinChoiceResponse::from)
                .toList()
        );
    }
}
