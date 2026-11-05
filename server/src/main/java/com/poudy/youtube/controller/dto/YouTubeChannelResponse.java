package com.poudy.youtube.controller.dto;

import com.poudy.youtube.domain.YouTubeChannel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record YouTubeChannelResponse(
    @NotNull String id,
    @NotNull String name,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Long subscriberCount,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String profileImageUrl,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String bannerImageUrl,
    @NotNull long videoCount,
    @NotNull long productCount,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String handle,
    @NotNull OffsetDateTime updatedAt) {
    public static YouTubeChannelResponse from(YouTubeChannel value) {
        return new YouTubeChannelResponse(
            value.id(),
            value.name(),
            value.subscriberCount(),
            value.profileImageUrl(),
            value.bannerImageUrl(),
            value.videoCount(),
            value.productCount(),
            value.handle(),
            value.updatedAt()
        );
    }
}
