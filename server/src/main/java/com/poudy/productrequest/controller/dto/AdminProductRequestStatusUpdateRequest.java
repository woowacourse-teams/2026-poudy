package com.poudy.productrequest.controller.dto;

import com.poudy.productrequest.domain.ProductRequestStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record AdminProductRequestStatusUpdateRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "IN_PROGRESS") ProductRequestStatus status) {
}
