package com.poudy.exception;

public class UnknownBrandException extends RuntimeException {

    public UnknownBrandException() {
        super(ErrorCode.BRAND_NOT_FOUND.message());
    }
}
