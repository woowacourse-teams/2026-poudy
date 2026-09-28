package com.poudy.curation.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record CurationProductItemResponse(
    @NotNull CurationProductResponse product,
    @NotNull @Size(min = 1) @Schema(description = "제품이 속한 블록 내 필터 ID. 하나 이상") List<UUID> filterIds) {
}
