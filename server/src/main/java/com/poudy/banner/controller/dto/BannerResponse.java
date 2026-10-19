package com.poudy.banner.controller.dto;

import com.poudy.banner.domain.Banner;
import jakarta.validation.constraints.NotNull;

public record BannerResponse(
    @NotNull Long id,
    @NotNull String title,
    @NotNull String description,
    @NotNull String imageUrl,
    @NotNull BannerTargetResponse target) {
    public static BannerResponse from(Banner banner) {
        return new BannerResponse(
            banner.id(),
            banner.title(),
            banner.description(),
            banner.imageUrl(),
            BannerTargetResponse.from(banner.target())
        );
    }
}
