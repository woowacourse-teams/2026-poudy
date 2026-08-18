package com.poudy.ingredient.controller.dto;

import com.poudy.common.domain.SearchKeyword;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Objects;
import org.hibernate.validator.constraints.UniqueElements;

public record IngredientQueryRequest(
        @Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL) @Schema(description = "검색어", example = "글리") String keyword,
        @UniqueElements @ArraySchema(schema = @Schema(implementation = Long.class, example = "2"), uniqueItems = true) List<Long> ingredientIds) {

    public IngredientQueryRequest {
        if (keyword != null) {
            keyword = SearchKeyword.withoutSpaces(keyword);
        }
        ingredientIds = Objects.requireNonNullElse(ingredientIds, List.of());
    }

    @AssertTrue(message = "INVALID_QUERY_PARAMETER")
    @Schema(hidden = true)
    public boolean isQueryConditionValid() {
        return keyword != null ^ !ingredientIds.isEmpty();
    }

    public boolean queriesByIds() {
        return !ingredientIds.isEmpty();
    }
}
