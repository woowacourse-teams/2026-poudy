package com.poudy.product.controller.dto;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.product.domain.ConflictingIngredientFilterException;
import com.poudy.product.domain.IngredientFilter;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.List;
import java.util.Objects;

public class ConflictingIngredientFilterValidator
        implements
        ConstraintValidator<ConflictingIngredientFilter, ProductFilterRequest> {

    private final ExcludeCodeIngredients excludeCodeIngredients;

    public ConflictingIngredientFilterValidator(ExcludeCodeIngredients excludeCodeIngredients) {
        this.excludeCodeIngredients = excludeCodeIngredients;
    }

    @Override
    public boolean isValid(ProductFilterRequest request, ConstraintValidatorContext context) {
        if (containsNull(request.includeIngredientIds())
                || containsNull(request.excludeIngredientIds())
                || containsNull(request.excludeCodes())) {
            return true;
        }

        try {
            IngredientFilter.of(
                    request.includeIngredientIds(),
                    request.excludeIngredientIds(),
                    excludeCodeIngredients.idsOf(request.excludeCodes()));

            return true;
        } catch (ConflictingIngredientFilterException exception) {
            return false;
        }
    }

    private static boolean containsNull(List<?> values) {
        return values.stream().anyMatch(Objects::isNull);
    }
}
