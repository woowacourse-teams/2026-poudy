package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductAttributeOption;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductAttributeOptionResponse(
    @NotNull String attributeCode,
    @NotNull String name,
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
