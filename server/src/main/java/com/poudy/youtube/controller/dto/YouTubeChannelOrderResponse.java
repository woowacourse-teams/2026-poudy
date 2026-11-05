package com.poudy.youtube.controller.dto;

import com.poudy.youtube.domain.YouTubeChannelOrder;
import jakarta.validation.constraints.NotNull;

public record YouTubeChannelOrderResponse(@NotNull String id, @NotNull String name, @NotNull int displayOrder) {
    public static YouTubeChannelOrderResponse from(YouTubeChannelOrder channel) {
        return new YouTubeChannelOrderResponse(channel.id(), channel.name(), channel.displayOrder());
    }
}
