package com.poudy.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record KeywordRequest(@NotBlank @Schema(description = "검색어") String keyword) {
}
