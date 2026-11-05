package com.poudy.youtube.domain;

import java.time.OffsetDateTime;

public record YouTubeProduct(
    long id,
    String name,
    String brandName,
    String imageUrl,
    long recommendedVideoCount,
    long videoCount,
    OffsetDateTime lastMentionedAt) {
}
