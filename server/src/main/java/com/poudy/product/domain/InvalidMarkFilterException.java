package com.poudy.product.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public final class InvalidMarkFilterException extends RuleViolationException {
    public InvalidMarkFilterException() {
        super(ErrorCode.INVALID_QUERY_PARAMETER, ErrorCode.INVALID_QUERY_PARAMETER.message());
    }
}
