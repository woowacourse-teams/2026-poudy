package com.poudy.exception;

public class EntityNotFoundException extends RuntimeException {

    private final ErrorCode code;

    public EntityNotFoundException(ErrorCode code) {
        this(code, code.message());
    }

    public EntityNotFoundException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
