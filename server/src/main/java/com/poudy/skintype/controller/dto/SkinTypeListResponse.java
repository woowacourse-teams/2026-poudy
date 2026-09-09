package com.poudy.skintype.controller.dto;

import com.poudy.skintype.domain.SkinType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.Arrays;
import java.util.List;

public record SkinTypeListResponse(
    @NotNull @Schema(description = "표시 순서대로 정렬된 피부타입 전체") List<SkinTypeResponse> items) {

    public static SkinTypeListResponse from() {
        return new SkinTypeListResponse(Arrays.stream(SkinType.values()).map(SkinTypeResponse::from).toList());
    }
}
