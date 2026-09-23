package com.poudy.productrequest.controller.dto;

import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminProductRequestResponse(
    @NotNull UUID requestId,
    @NotNull String productName,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String brandName,
    @NotNull OffsetDateTime requestedAt,
    @NotNull ProductRequestStatus status,
    @NotNull OffsetDateTime statusChangedAt,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) OffsetDateTime completedAt) {

    public static AdminProductRequestResponse from(ProductRequest request) {
        return new AdminProductRequestResponse(
            request.requestId(),
            request.productName(),
            request.brandName(),
            request.requestedAt(),
            request.status(),
            request.statusChangedAt(),
            request.completedAt()
        );
    }
}
