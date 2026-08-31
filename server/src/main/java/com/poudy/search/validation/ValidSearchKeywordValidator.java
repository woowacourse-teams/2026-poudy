package com.poudy.search.validation;

import com.poudy.search.domain.SearchKeyword;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidSearchKeywordValidator implements ConstraintValidator<ValidSearchKeyword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }

        return value.length() <= ValidSearchKeyword.MAX_LENGTH && !new SearchKeyword(value).isEmpty();
    }
}
