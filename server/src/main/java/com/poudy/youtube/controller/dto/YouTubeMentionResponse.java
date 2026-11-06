package com.poudy.youtube.controller.dto;

import com.poudy.youtube.domain.YouTubeMention;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record YouTubeMentionResponse(
    @NotNull int ordinal,
    @NotNull long productId,
    @NotNull String productName,
    @NotNull String brandName,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String productImageUrl,
    @NotNull String spokenName,
    @NotNull long startMs,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Long endMs,
    @NotNull String summary,
    @NotNull String recommendation,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String recommendationCondition,
    @NotNull String videoRecommendation,
    @NotNull long recommendedVideoCount) {
    public static YouTubeMentionResponse from(YouTubeMention value) {
        return new YouTubeMentionResponse(
            value.ordinal(),
            value.productId(),
            value.productName(),
            value.brandName(),
            value.productImageUrl(),
            value.spokenName(),
            value.startMs(),
            value.endMs(),
            value.summary(),
            value.recommendation(),
            value.recommendationCondition(),
            value.videoRecommendation(),
            value.recommendedVideoCount()
        );
    }
}
