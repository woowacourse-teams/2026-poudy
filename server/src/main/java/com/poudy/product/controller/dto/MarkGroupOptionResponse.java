package com.poudy.product.controller.dto;

import com.poudy.product.domain.MarkGroupOption;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MarkGroupOptionResponse(
    @NotNull String code,
    @NotNull String name,
    @NotNull List<MarkOptionResponse> options) {
    public static MarkGroupOptionResponse from(MarkGroupOption group) {
        return new MarkGroupOptionResponse(
            group.code(),
            group.name(),
            group.options().stream()
                .map(MarkOptionResponse::from).toList()
        );
    }
}
