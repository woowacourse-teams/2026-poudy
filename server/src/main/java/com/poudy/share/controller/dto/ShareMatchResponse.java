package com.poudy.share.controller.dto;

import com.poudy.product.domain.Product;
import com.poudy.share.domain.ShareMatch;
import com.poudy.share.domain.ShareMatchStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ShareMatchResponse(
        @NotNull @Schema(description = "제품 확정 여부") ShareMatchStatus status,
        @Schema(description = "확정한 제품 ID. MATCHED 일 때만 있다", example = "8") Long productId,
        @Schema(description = "검색에 넘길 검색어. NOT_FOUND 일 때만 있다", example = "레드 블레미쉬 클리어") String keyword) {

    public static ShareMatchResponse from(ShareMatch match) {
        if (match.isNotFound()) {
            return new ShareMatchResponse(ShareMatchStatus.NOT_FOUND, null, match.keyword());
        }

        return new ShareMatchResponse(
                ShareMatchStatus.MATCHED,
                match.product().map(Product::id).orElseThrow(),
                null);
    }
}
