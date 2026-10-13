package com.poudy.exception;

public class ForbiddenRequestException extends RuntimeException {

    private final ErrorCode code;

    public ForbiddenRequestException(ErrorCode code) {
        super(code.message());
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
