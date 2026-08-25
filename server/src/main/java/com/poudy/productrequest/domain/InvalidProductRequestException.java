package com.poudy.productrequest.domain;

public class InvalidProductRequestException extends IllegalArgumentException {

    public InvalidProductRequestException(String message) {
        super(message);
    }
}
