package com.poudy.product.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

public record IngredientFilter(List<Long> includedIds, List<Long> excludedIds) {

    public IngredientFilter {
        includedIds = List.copyOf(Objects.requireNonNullElse(includedIds, List.of()));
        excludedIds = List.copyOf(Objects.requireNonNullElse(excludedIds, List.of()));

        if (includedIds.stream().anyMatch(excludedIds::contains)) {
            throw new InvalidRequestException(ErrorCode.CONFLICTING_INGREDIENT_FILTER);
        }
    }

    public static IngredientFilter of(List<Long> includedIds, List<Long> excludedIds, List<ExcludeCode> excludedCodes) {
        List<Long> resolved = Stream.concat(
                Objects.requireNonNullElse(excludedIds, List.<Long>of()).stream(),
                ExcludeCodeIngredients.idsOf(excludedCodes).stream()).distinct().toList();

        return new IngredientFilter(includedIds, resolved);
    }
}
