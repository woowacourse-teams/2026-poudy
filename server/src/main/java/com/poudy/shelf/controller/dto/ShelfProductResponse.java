package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.ShelfItem;
import com.poudy.shelf.domain.ShelfUsageStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record ShelfProductResponse(
    @NotNull ShelfProductInfoResponse product,
    @NotNull @Schema(example = "IN_USE") ShelfUsageStatus usageStatus,
    @NotNull RatingResponse rating,
    @NotNull @Schema(example = "false") Boolean possiblyUnsuitable,
    @NotNull @Schema(example = "2026-10-10T16:30:00+09:00") OffsetDateTime registeredAt) {

    public static ShelfProductResponse from(ShelfItem item) {
        return new ShelfProductResponse(
            ShelfProductInfoResponse.from(item.product()),
            item.usageStatus(),
            RatingResponse.from(item.rating()),
            item.isPossiblyUnsuitable(),
            item.registeredAt()
        );
    }
}
