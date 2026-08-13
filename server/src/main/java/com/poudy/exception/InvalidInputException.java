package com.poudy.exception;

public class InvalidInputException extends RuntimeException {

    private final ErrorCode code;

    public InvalidInputException(ErrorCode code) {
        this(code, code.message());
    }

    public InvalidInputException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
