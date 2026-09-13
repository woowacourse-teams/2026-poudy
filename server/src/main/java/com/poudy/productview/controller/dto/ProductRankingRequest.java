package com.poudy.productview.controller.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;
import java.util.Objects;
import org.hibernate.validator.constraints.UniqueElements;

public record ProductRankingRequest(
    @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<@NotNull Long> categoryIds,
    @Positive @Schema(description = "한국 시간 기준 오늘을 포함해 집계할 날짜 수. 미지정 시 전체 기간", example = "30") Integer days) {

    public ProductRankingRequest {
        categoryIds = Objects.requireNonNullElse(categoryIds, List.of());
    }
}
