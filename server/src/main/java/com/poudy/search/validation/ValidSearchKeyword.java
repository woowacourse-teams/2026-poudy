package com.poudy.search.validation;

import com.poudy.search.domain.SearchKeyword;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidSearchKeywordValidator.class)
public @interface ValidSearchKeyword {

    public static final int MAX_LENGTH = SearchKeyword.MAX_LENGTH;

    String message() default "INVALID_QUERY_PARAMETER";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
