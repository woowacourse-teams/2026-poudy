package com.poudy.product.dto;

import com.poudy.brand.dto.BrandSummaryResponse;
import com.poudy.category.dto.CategorySummaryResponse;
import com.poudy.ingredient.domain.ExcludeCode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record ProductDetailResponse(@NotNull Long id, @NotNull String name, @NotNull BrandSummaryResponse brand,
        @NotNull List<CategorySummaryResponse> categories, @NotNull String imageUrl, @NotNull Long price,
        @NotNull BigDecimal volumeValue, @NotNull String volumeUnit, @NotNull @Min(0) @Max(3) Integer moistureLevel,
        @NotNull @Min(0) @Max(3) Integer oilLevel, @NotNull List<BenefitResponse> benefits,
        @NotNull List<ProductIngredientResponse> ingredients, @NotNull List<ExcludeCode> freeOfCodes) {
}
