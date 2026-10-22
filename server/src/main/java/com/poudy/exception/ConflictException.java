package com.poudy.exception;

public class ConflictException extends RuntimeException {
    private final ErrorCode code;
    public ConflictException(ErrorCode code) {
        super(code.message());
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
