package com.poudy.productrequest.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.productrequest.domain.ProductRequestPage;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AdminProductRequestPageResponse(
    @NotNull List<AdminProductRequestResponse> items,
    @NotNull PaginationResponse pagination) {

    public static AdminProductRequestPageResponse from(ProductRequestPage page, PaginationRequest pagination) {
        return new AdminProductRequestPageResponse(
            page.items().stream().map(AdminProductRequestResponse::from).toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
