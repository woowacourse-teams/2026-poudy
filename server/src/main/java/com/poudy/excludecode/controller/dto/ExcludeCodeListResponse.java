package com.poudy.excludecode.controller.dto;

import com.poudy.excludecode.domain.ExcludeCodes;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExcludeCodeListResponse(
    @NotNull @Schema(description = "빠른 필터에 쓰는 성분군 전체") List<ExcludeCodeResponse> items) {

    public static ExcludeCodeListResponse from(ExcludeCodes ingredients) {
        return new ExcludeCodeListResponse(
            ingredients.groups().stream()
                .map(ExcludeCodeResponse::from)
                .toList()
        );
    }
}
