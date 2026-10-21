package com.poudy.excludecode.controller.dto;

import com.poudy.excludecode.domain.ExcludeCodeSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExcludeGroupSummaryResponse(
    @NotNull @Schema(description = "빠른 제외 성분군 코드", example = "FRAGRANCE_ALLERGENS") String code,
    @NotNull @Schema(description = "빠른 제외 성분군 이름", example = "향료/알레르기 성분") String name) {

    public static List<ExcludeGroupSummaryResponse> from(List<ExcludeCodeSummary> groups) {
        return groups.stream()
            .map(group -> new ExcludeGroupSummaryResponse(group.code().value(), group.name()))
            .toList();
    }
}
