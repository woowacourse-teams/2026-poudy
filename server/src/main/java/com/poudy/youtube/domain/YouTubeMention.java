package com.poudy.youtube.domain;

public record YouTubeMention(
    int ordinal,
    long productId,
    String productName,
    String brandName,
    String productImageUrl,
    String spokenName,
    long startMs,
    Long endMs,
    String summary,
    String recommendation,
    String recommendationCondition,
    String videoRecommendation,
    long recommendedVideoCount) {
}
