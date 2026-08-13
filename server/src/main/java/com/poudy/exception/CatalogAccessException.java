package com.poudy.exception;

public class CatalogAccessException extends RuntimeException {

    public CatalogAccessException(String message, Throwable cause) {
        super(message, cause);
    }
}
