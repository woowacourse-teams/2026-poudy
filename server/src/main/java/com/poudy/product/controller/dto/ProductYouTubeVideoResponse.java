package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductYouTubeVideo;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductYouTubeVideoResponse(
    @NotNull String id,
    @NotNull String title,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String thumbnailUrl) {
    public static ProductYouTubeVideoResponse from(ProductYouTubeVideo video) {
        return new ProductYouTubeVideoResponse(video.id(), video.title(), video.thumbnailUrl());
    }
}
