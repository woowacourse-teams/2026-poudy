package com.poudy.inquiry.controller.dto;

import com.poudy.common.dto.PaginationResponse;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AdminInquiryPageResponse(
    @NotNull List<AdminInquiryResponse> items,
    @NotNull PaginationResponse pagination) {
}
