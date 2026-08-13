package com.poudy.product.domain;

import com.poudy.exception.ConflictException;
import com.poudy.exception.ErrorCode;
import java.util.List;
import java.util.Objects;

public record IngredientFilter(List<Long> includedIds, List<Long> excludedIds) {

    public IngredientFilter {
        includedIds = List.copyOf(Objects.requireNonNullElse(includedIds, List.of()));
        excludedIds = List.copyOf(Objects.requireNonNullElse(excludedIds, List.of()));

        if (includedIds.stream().anyMatch(excludedIds::contains)) {
            throw new ConflictException(ErrorCode.CONFLICTING_INGREDIENT_FILTER);
        }
    }
}
