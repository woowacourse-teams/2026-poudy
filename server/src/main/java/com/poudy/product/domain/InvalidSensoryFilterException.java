package com.poudy.product.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidSensoryFilterException extends RuleViolationException {

    public InvalidSensoryFilterException() {
        super(ErrorCode.INVALID_QUERY_PARAMETER, "수분감·유분감 필터는 0부터 3까지 0.5 단위여야 합니다.");
    }
}
