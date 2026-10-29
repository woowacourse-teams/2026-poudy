package com.poudy.product.controller.dto;

import com.poudy.product.domain.MarkGroupOption;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(name = "Option")
public record MarkOptionResponse(@NotNull String code, @NotNull String name, @NotNull Long productCount) {
    public static MarkOptionResponse from(MarkGroupOption.Option option) {
        return new MarkOptionResponse(option.code(), option.name(), option.productCount());
    }
}
