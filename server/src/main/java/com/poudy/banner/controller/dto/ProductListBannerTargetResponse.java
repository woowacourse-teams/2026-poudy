package com.poudy.banner.controller.dto;

import com.poudy.curation.controller.dto.CurationProductLinkQueryResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductListBannerTargetResponse(
    @Schema(allowableValues = "PRODUCT_LIST") @NotNull String type,
    @NotNull CurationProductLinkQueryResponse query) implements BannerTargetResponse {
}
