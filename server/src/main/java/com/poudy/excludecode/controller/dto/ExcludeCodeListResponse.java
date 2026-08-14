package com.poudy.excludecode.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ExcludeCodeListResponse(
        @NotNull @Schema(description = "빠른 필터에 쓰는 성분군 전체") List<ExcludeCodeResponse> items) {
}
