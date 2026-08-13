package com.poudy.product.dto;

import com.poudy.ingredient.domain.ExcludeCode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;

public record ProductFilterRequest(String keyword, List<Long> categoryIds, List<Long> brandIds,
        List<@Min(0) @Max(3) Integer> moistureLevel, List<@Min(0) @Max(3) Integer> oilLevel,
        List<ExcludeCode> excludeCodes, List<Long> includeIngredientIds, List<Long> excludeIngredientIds) {
}
