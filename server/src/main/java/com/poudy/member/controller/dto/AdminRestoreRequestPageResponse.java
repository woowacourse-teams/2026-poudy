package com.poudy.member.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.member.domain.RestoreRequestPage;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AdminRestoreRequestPageResponse(
    @NotNull List<AdminRestoreRequestResponse> items,
    @NotNull PaginationResponse pagination) {

    public static AdminRestoreRequestPageResponse from(RestoreRequestPage page, PaginationRequest pagination) {
        return new AdminRestoreRequestPageResponse(
            page.items().stream().map(AdminRestoreRequestResponse::from).toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
