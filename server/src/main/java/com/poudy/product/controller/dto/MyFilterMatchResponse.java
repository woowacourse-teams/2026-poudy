package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MyFilterMatchResponse(
    @NotNull @ArraySchema(schema = @Schema(description = "나만의 필터 성분이 든 제품 ID. 요청 순서를 따른다", example = "101")) List<Long> matchedProductIds) {

    public static MyFilterMatchResponse from(List<Long> matchedProductIds) {
        return new MyFilterMatchResponse(matchedProductIds);
    }
}
