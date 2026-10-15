package com.poudy.shelf.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidRatingException extends RuleViolationException {

    public InvalidRatingException() {
        super(ErrorCode.INVALID_REQUEST_BODY, "평가 수분감·유분감은 0부터 3까지 0.5 단위여야 합니다.");
    }
}
