package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.hibernate.validator.constraints.UniqueElements;

public record MyFilterMatchRequest(
    @NotNull @Size(min = 1, max = MAX_PRODUCTS) @UniqueElements @ArraySchema(schema = @Schema(description = "확인할 제품 ID", example = "101", minimum = "1"), minItems = 1, maxItems = MAX_PRODUCTS, uniqueItems = true) List<@NotNull @Positive Long> productIds) {

    public static final int MAX_PRODUCTS = 100;
}
