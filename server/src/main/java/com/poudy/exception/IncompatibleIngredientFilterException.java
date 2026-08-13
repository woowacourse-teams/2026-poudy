package com.poudy.exception;

public class IncompatibleIngredientFilterException extends RuntimeException {

    public IncompatibleIngredientFilterException() {
        super(ErrorCode.CONFLICTING_INGREDIENT_FILTER.message());
    }
}
