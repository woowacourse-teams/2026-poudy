package com.poudy.product.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.poudy.product.domain.ProductDetail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPartSummaryResponse(
    @NotNull @Schema(example = "473") Long id,
    @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(example = "아쿠아 세럼") String name,
    @NotNull @Schema(example = "2") Long cautionCount) {

    public static List<ProductPartSummaryResponse> from(ProductDetail detail) {
        return detail.product().parts().stream()
            .map(part -> new ProductPartSummaryResponse(part.id(), part.name(), detail.cautionCountOf(part)))
            .toList();
    }
}
