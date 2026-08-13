package com.poudy.product.domain;

import com.poudy.exception.ConflictException;
import com.poudy.exception.ErrorCode;
import java.util.List;

public record IngredientFilter(List<Long> includedIds, List<Long> excludedIds) {

    public IngredientFilter {
        includedIds = includedIds == null ? List.of() : List.copyOf(includedIds);
        excludedIds = excludedIds == null ? List.of() : List.copyOf(excludedIds);

        if (includedIds.stream().anyMatch(excludedIds::contains)) {
            throw new ConflictException(ErrorCode.CONFLICTING_INGREDIENT_FILTER);
        }
    }
}
