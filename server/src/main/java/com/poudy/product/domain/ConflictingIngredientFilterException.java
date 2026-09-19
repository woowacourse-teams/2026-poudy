package com.poudy.product.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class ConflictingIngredientFilterException extends RuleViolationException {

    public ConflictingIngredientFilterException() {
        super(ErrorCode.CONFLICTING_INGREDIENT_FILTER, "같은 성분을 포함과 제외에 함께 쓸 수 없습니다.");
    }
}
