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

    String NAME = "ConflictingIngredientFilter";

    String message() default "같은 성분을 포함과 제외에 함께 쓸 수 없습니다.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
