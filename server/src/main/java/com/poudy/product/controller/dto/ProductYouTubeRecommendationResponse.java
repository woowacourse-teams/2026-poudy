package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductYouTubeRecommendation;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductYouTubeRecommendationResponse(
    @NotNull String channelId,
    @NotNull String channelName,
    @NotNull @Min(1) @Schema(description = "최근 1년의 공개 설정된 영상 중 해당 제품을 명확히 추천한 전체 영상 수") long recommendedVideoCount,
    @NotNull @Schema(description = "해당 제품을 명확히 추천한 영상 중 게시일이 가장 최근인 영상") ProductYouTubeVideoResponse latestVideo) {
    public static ProductYouTubeRecommendationResponse from(ProductYouTubeRecommendation recommendation) {
        return new ProductYouTubeRecommendationResponse(
            recommendation.channelId(),
            recommendation.channelName(),
            recommendation.recommendedVideoCount(),
            ProductYouTubeVideoResponse.from(recommendation.latestVideo())
        );
    }
}
