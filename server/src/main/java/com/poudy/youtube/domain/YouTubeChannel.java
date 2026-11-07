package com.poudy.youtube.domain;

import java.time.OffsetDateTime;

public record YouTubeChannel(
    String id,
    String name,
    Long subscriberCount,
    String profileImageUrl,
    String bannerImageUrl,
    long videoCount,
    long productCount,
    long totalViewCount,
    String handle,
    OffsetDateTime updatedAt) {
}
