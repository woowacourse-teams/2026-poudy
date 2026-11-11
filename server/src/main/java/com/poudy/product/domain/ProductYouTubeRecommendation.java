package com.poudy.product.domain;

public record ProductYouTubeRecommendation(
    String channelId,
    String channelName,
    long recommendedVideoCount,
    ProductYouTubeVideo latestVideo) {
}
