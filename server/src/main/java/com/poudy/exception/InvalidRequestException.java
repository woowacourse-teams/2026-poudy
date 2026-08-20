package com.poudy.exception;

public class InvalidRequestException extends RuntimeException {

    private final ErrorCode code;

    public InvalidRequestException(ErrorCode code) {
        this(code, code.message());
    }

    public InvalidRequestException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
