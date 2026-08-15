package com.poudy.category.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryResponse(
        @NotNull @Schema(example = "1") Long id,
        @NotNull @Schema(example = "스킨케어") String name,
        @NotNull List<CategoryChildResponse> children,
        @NotNull @Schema(example = "51") Long productCount) {

    public static List<CategoryResponse> samples() {
        return List.of(
                new CategoryResponse(
                        1L,
                        "스킨케어",
                        List.of(new CategoryChildResponse(7L, "토너", 30L), new CategoryChildResponse(8L, "세럼", 21L)),
                        51L),
                new CategoryResponse(2L, "클렌징", List.of(), 12L));
    }

    public static List<CategoryResponse> samplesOfBrand() {
        return List.of(
                new CategoryResponse(
                        1L,
                        "스킨케어",
                        List.of(new CategoryChildResponse(7L, "토너", 12L), new CategoryChildResponse(8L, "세럼", 9L)),
                        21L),
                new CategoryResponse(2L, "클렌징", List.of(), 6L));
    }
}
