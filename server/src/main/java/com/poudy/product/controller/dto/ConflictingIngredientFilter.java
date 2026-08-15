package com.poudy.product.controller.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(java.lang.annotation.ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ConflictingIngredientFilterValidator.class)
public @interface ConflictingIngredientFilter {

    String message() default "CONFLICTING_INGREDIENT_FILTER";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
