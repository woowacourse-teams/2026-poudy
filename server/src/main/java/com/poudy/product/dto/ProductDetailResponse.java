package com.poudy.product.dto;

import com.poudy.brand.dto.BrandSummaryResponse;
import com.poudy.category.dto.CategorySummaryResponse;
import com.poudy.ingredient.domain.ExcludeCode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record ProductDetailResponse(
        @NotNull @Schema(example = "101") Long id,
        @NotNull @Schema(example = "스킨케어 이름") String name,
        @NotNull BrandSummaryResponse brand,
        @NotNull List<CategorySummaryResponse> categories,
        @NotNull @Schema(example = "https://cdn.example.com/products/101.png") String imageUrl,
        @NotNull @Schema(example = "18000") Long price,
        @NotNull @Schema(example = "200") BigDecimal volumeValue,
        @NotNull @Schema(example = "ml") String volumeUnit,
        @NotNull @Min(0) @Max(3) @Schema(example = "3") Integer moistureLevel,
        @NotNull @Min(0) @Max(3) @Schema(example = "1") Integer oilLevel,
        @NotNull List<BenefitResponse> benefits,
        @NotNull List<ProductIngredientResponse> ingredients,
        @NotNull List<ExcludeCode> freeOfCodes) {
}
