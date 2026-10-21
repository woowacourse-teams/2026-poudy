package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductSuggestion;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductSuggestionResponse(
    @NotNull @Schema(description = "제품 ID", example = "101") Long id,
    @NotNull @Schema(description = "제품명", example = "스킨케어 이름") String name,
    @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String brandName,
    @NotNull @Schema(description = "제품 표식, 없으면 빈 배열") List<MarkResponse> marks,
    @NotNull @Schema(description = "제품 대표 이미지 URL", example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(description = "검색어가 실제로 일치한 필드와 원문 구간") ProductSuggestionMatchResponse match) {

    public static ProductSuggestionResponse from(ProductSuggestion matched) {
        return new ProductSuggestionResponse(
            matched.id(),
            matched.name(),
            matched.brandName(),
            MarkResponse.from(matched.marks()),
            matched.imageUrl(),
            ProductSuggestionMatchResponse.from(matched)
        );
    }
}
