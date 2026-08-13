package com.poudy.exception;

public class UnknownIngredientException extends RuntimeException {

    public UnknownIngredientException() {
        super(ErrorCode.INGREDIENT_NOT_FOUND.message());
    }
}
