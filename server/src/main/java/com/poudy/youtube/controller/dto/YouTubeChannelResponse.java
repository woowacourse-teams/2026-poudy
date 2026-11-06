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
    @Schema(description = "등록된 모든 업로드 영상의 조회수 합계. 미노출 영상과 1년 이전 영상도 포함하며 미수집 조회수는 0으로 계산") @NotNull long totalViewCount,
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
            value.totalViewCount(),
            value.handle(),
            value.updatedAt()
        );
    }
}
