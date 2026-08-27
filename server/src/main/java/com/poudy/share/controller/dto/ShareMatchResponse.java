package com.poudy.share.controller.dto;

import com.poudy.share.domain.ShareMatch;
import com.poudy.share.domain.ShareMatchStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ShareMatchResponse(
    @NotNull ShareMatchStatus status,
    @Schema(example = "8", nullable = true) Long productId,
    @Schema(example = "레드 블레미쉬 클리어", nullable = true) String keyword) {

    public static ShareMatchResponse from(ShareMatch match) {
        if (match.isNotFound()) {
            return new ShareMatchResponse(ShareMatchStatus.NOT_FOUND, null, match.keyword());
        }

        return new ShareMatchResponse(ShareMatchStatus.MATCHED, match.productId(), null);
    }
}
