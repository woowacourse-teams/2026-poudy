package com.poudy.common.dto;

import com.poudy.search.validation.ValidSearchKeyword;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record KeywordRequest(
    @NotBlank @ValidSearchKeyword @Schema(description = "검색어") String keyword) {
}
