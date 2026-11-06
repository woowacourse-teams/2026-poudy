package com.poudy.youtube.controller.dto;

import com.poudy.youtube.domain.YouTubeVideo;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public record YouTubeVideoResponse(
    @NotNull String id,
    @NotNull String channelId,
    @NotNull String channelName,
    @NotNull String title,
    @NotNull String description,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String thumbnailUrl,
    @NotNull long durationMs,
    @NotNull OffsetDateTime publishedAt,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Long viewCount,
    @NotNull List<YouTubeMentionResponse> mentions) {
    public static YouTubeVideoResponse from(YouTubeVideo value) {
        return new YouTubeVideoResponse(
            value.id(),
            value.channelId(),
            value.channelName(),
            value.title(),
            value.description(),
            value.thumbnailUrl(),
            value.durationMs(),
            value.publishedAt(),
            value.viewCount(),
            value.mentions().stream().map(YouTubeMentionResponse::from).toList()
        );
    }
}
