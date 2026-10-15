package com.poudy.shelf.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class ShelfProductAlreadyExistsException extends RuleViolationException {

    public ShelfProductAlreadyExistsException() {
        super(ErrorCode.SHELF_PRODUCT_ALREADY_EXISTS, "이미 선반에 있는 제품입니다.");
    }
}
