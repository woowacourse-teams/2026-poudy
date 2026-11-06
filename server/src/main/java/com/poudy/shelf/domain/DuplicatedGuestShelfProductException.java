package com.poudy.shelf.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class DuplicatedGuestShelfProductException extends RuleViolationException {

    public DuplicatedGuestShelfProductException() {
        super(ErrorCode.INVALID_REQUEST_BODY, "같은 제품이 두 번 들어왔습니다.");
    }
}
