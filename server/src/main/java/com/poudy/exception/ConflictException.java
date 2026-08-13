package com.poudy.exception;

public class ConflictException extends RuntimeException {

    private final ErrorCode code;

    public ConflictException(ErrorCode code) {
        this(code, code.message());
    }

    public ConflictException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
