package com.poudy.banner.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ExternalBannerTargetResponse(
    @Schema(allowableValues = "EXTERNAL") @NotNull String type,
    @NotNull String url) implements BannerTargetResponse {
}
