package com.poudy.product.controller.dto;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.excludecode.domain.ExcludeCode;
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

    public static final String KEYWORD = "keyword";

    public void validateSearchOnly() {
        if (hasFilterCondition()) {
            throw new InvalidRequestException(ErrorCode.CONFLICTING_SEARCH_AND_FILTER);
        }
        if (keyword == null || keyword.isBlank()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }
    }

    public boolean hasFilterCondition() {
        return isPresent(categoryIds) || isPresent(brandIds) || isPresent(moistureLevel) || isPresent(oilLevel)
                || isPresent(excludeCodes)
                || isPresent(includeIngredientIds) || isPresent(excludeIngredientIds);
    }

    private boolean isPresent(List<?> condition) {
        return condition != null && !condition.isEmpty();
    }
}
