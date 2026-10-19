package com.poudy.banner.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CurationBannerTargetResponse(
    @Schema(allowableValues = "CURATION") @NotNull String type,
    @NotNull @Min(1) Long curationId) implements BannerTargetResponse {
}
