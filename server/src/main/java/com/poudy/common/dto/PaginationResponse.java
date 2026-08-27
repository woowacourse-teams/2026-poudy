package com.poudy.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record PaginationResponse(
    @NotNull @Schema(example = "0") Integer page,
    @NotNull @Schema(example = "20") Integer size,
    @NotNull @Schema(example = "48") Long totalElements,
    @NotNull @Schema(example = "3") Integer totalPages,
    @NotNull @Schema(example = "true") Boolean hasNext) {

    public static PaginationResponse of(PaginationRequest request, long totalElements) {
        int totalPages = (int) Math.ceil((double) totalElements / request.size());

        return new PaginationResponse(
            request.page(),
            request.size(),
            totalElements,
            totalPages,
            request.page() < totalPages - 1
        );
    }
}
