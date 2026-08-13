package com.poudy.exception;

public class UnknownProductException extends RuntimeException {

    public UnknownProductException() {
        super(ErrorCode.PRODUCT_NOT_FOUND.message());
    }
}
