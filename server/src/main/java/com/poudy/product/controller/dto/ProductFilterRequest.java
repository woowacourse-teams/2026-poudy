package com.poudy.product.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.product.domain.IngredientFilter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Set;
import org.hibernate.validator.constraints.UniqueElements;

@ConflictingIngredientFilter
public record ProductFilterRequest(
        @Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL) @Schema(example = "토너") String keyword,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<Long> categoryIds,
        @UniqueElements @ArraySchema(schema = @Schema(example = "12"), uniqueItems = true) List<Long> brandIds,
        @UniqueElements @ArraySchema(schema = @Schema(example = "3"), uniqueItems = true) List<@Min(0) @Max(3) Integer> moistureLevel,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<@Min(0) @Max(3) Integer> oilLevel,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1005"), uniqueItems = true) List<Long> includeIngredientIds,
        @UniqueElements @ArraySchema(schema = @Schema(example = "1001"), uniqueItems = true) List<Long> excludeIngredientIds,
        @UniqueElements @ArraySchema(schema = @Schema(description = "빠른 제외 성분군. 이 성분군에 속한 성분을 하나라도 포함하면 제외한다", example = "HARSH_PRESERVATIVES"), uniqueItems = true) List<ExcludeCode> excludeCodes) {

    public ProductFilterRequest {
        IngredientFilter.of(includeIngredientIds, excludeIngredientIds, Set.of());
    }
}
