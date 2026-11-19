package com.poudy.youtube.controller.dto;

import com.poudy.category.controller.dto.CategorySummaryResponse;
import com.poudy.youtube.domain.YouTubeProduct;
import com.poudy.youtube.domain.YouTubeProductCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record YouTubeProductResponse(
    @NotNull long id,
    @NotNull String name,
    @NotNull String brandName,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String imageUrl,
    @NotNull long recommendedVideoCount,
    @NotNull long videoCount,
    @NotNull OffsetDateTime lastMentionedAt,
    @Schema(description = "제품이 속한 소분류 카테고리", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) CategorySummaryResponse category) {
    public static YouTubeProductResponse from(YouTubeProduct value) {
        return new YouTubeProductResponse(
            value.id(),
            value.name(),
            value.brandName(),
            value.imageUrl(),
            value.recommendedVideoCount(),
            value.videoCount(),
            value.lastMentionedAt(),
            categoryResponse(value.category())
        );
    }

    private static CategorySummaryResponse categoryResponse(YouTubeProductCategory category) {
        if (category == null) {
            return null;
        }
        return new CategorySummaryResponse(category.id(), category.name());
    }
}
