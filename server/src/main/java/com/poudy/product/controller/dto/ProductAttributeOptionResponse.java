package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductAttributeOption;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductAttributeOptionResponse(
    @NotNull @Schema(description = "속성 코드", example = "UV_FILTER_TYPE") String attributeCode,
    @NotNull @Schema(description = "속성 표시명", example = "자외선 차단 유형") String name,
    @NotNull List<ProductAttributeValueOptionResponse> values) {

    public static ProductAttributeOptionResponse from(ProductAttributeOption option) {
        return new ProductAttributeOptionResponse(
            option.attributeCode(),
            option.name(),
            option.values().stream()
                .map(
                    value -> new ProductAttributeValueOptionResponse(
                        value.valueCode(),
                        value.name(),
                        value.productCount()
                    )
                )
                .toList()
        );
    }
}
