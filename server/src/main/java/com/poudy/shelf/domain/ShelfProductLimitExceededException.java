package com.poudy.shelf.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class ShelfProductLimitExceededException extends RuleViolationException {

    public ShelfProductLimitExceededException() {
        super(ErrorCode.SHELF_PRODUCT_LIMIT_EXCEEDED, "파우치에는 제품을 100개까지 담을 수 있습니다.");
    }
}
