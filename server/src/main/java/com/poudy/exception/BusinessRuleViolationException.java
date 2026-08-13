package com.poudy.exception;

public class BusinessRuleViolationException extends RuntimeException {

    private final ErrorCode code;

    public BusinessRuleViolationException(ErrorCode code) {
        this(code, code.message());
    }

    public BusinessRuleViolationException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
