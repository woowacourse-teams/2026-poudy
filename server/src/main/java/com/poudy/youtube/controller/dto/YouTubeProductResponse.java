package com.poudy.youtube.controller.dto;

import com.poudy.youtube.domain.YouTubeProduct;
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
    @NotNull OffsetDateTime lastMentionedAt) {
    public static YouTubeProductResponse from(YouTubeProduct value) {
        return new YouTubeProductResponse(
            value.id(),
            value.name(),
            value.brandName(),
            value.imageUrl(),
            value.recommendedVideoCount(),
            value.videoCount(),
            value.lastMentionedAt()
        );
    }
}
