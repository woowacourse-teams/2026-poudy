package com.poudy.product.dto;

import com.poudy.ingredient.domain.ExcludeCode;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.hibernate.validator.constraints.UniqueElements;

public record ProductFilterRequest(
        @Schema(example = "토너") String keyword,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<Long> categoryIds,
        @UniqueElements @ArraySchema(schema = @Schema(example = "12"), uniqueItems = true) List<Long> brandIds,
        @UniqueElements @ArraySchema(schema = @Schema(example = "3"), uniqueItems = true) List<@Min(0) @Max(3) Integer> moistureLevel,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<@Min(0) @Max(3) Integer> oilLevel,
        @UniqueElements @ArraySchema(uniqueItems = true) List<ExcludeCode> excludeCodes,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1005"), uniqueItems = true) List<Long> includeIngredientIds,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1001"), uniqueItems = true) List<Long> excludeIngredientIds) {
}
