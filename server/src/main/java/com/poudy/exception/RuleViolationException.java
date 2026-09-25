package com.poudy.exception;

public abstract class RuleViolationException extends IllegalArgumentException {

    private final ErrorCode code;

    protected RuleViolationException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    protected RuleViolationException(ErrorCode code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
