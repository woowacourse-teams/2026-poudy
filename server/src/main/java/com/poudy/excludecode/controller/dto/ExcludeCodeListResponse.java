package com.poudy.excludecode.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.Arrays;
import java.util.List;

public record ExcludeCodeListResponse(
        @NotNull @Schema(description = "빠른 필터에 쓰는 성분군 전체") List<ExcludeCodeResponse> items) {

    public static ExcludeCodeListResponse from(ExcludeCodeIngredients ingredients) {
        // spotless:off
        return new ExcludeCodeListResponse(
                Arrays.stream(ExcludeCode.values())
                        .map(code -> ExcludeCodeResponse.from(code, ingredients))
                        .toList());
        // spotless:on
    }
}
