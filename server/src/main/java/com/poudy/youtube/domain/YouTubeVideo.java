package com.poudy.youtube.domain;

import java.time.OffsetDateTime;
import java.util.List;

public record YouTubeVideo(
    String id,
    String channelId,
    String channelName,
    String title,
    String description,
    String thumbnailUrl,
    long durationMs,
    OffsetDateTime publishedAt,
    Long viewCount,
    List<YouTubeMention> mentions) {
}
