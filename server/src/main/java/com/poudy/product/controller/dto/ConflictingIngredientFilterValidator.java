package com.poudy.product.controller.dto;

import com.poudy.exception.InvalidRequestException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.product.domain.IngredientFilter;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ConflictingIngredientFilterValidator
        implements
        ConstraintValidator<ConflictingIngredientFilter, ProductFilterRequest> {

    private final ExcludeCodeIngredients excludeCodeIngredients;

    public ConflictingIngredientFilterValidator(ExcludeCodeIngredients excludeCodeIngredients) {
        this.excludeCodeIngredients = excludeCodeIngredients;
    }

    @Override
    public boolean isValid(ProductFilterRequest request, ConstraintValidatorContext context) {
        try {
            IngredientFilter.of(
                    request.includeIngredientIds(),
                    request.excludeIngredientIds(),
                    excludeCodeIngredients.idsOf(request.excludeCodes()));

            return true;
        } catch (InvalidRequestException exception) {
            return false;
        }
    }
}
