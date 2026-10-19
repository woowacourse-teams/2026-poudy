package com.poudy.shelf.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class UnsupportedSensoryRatingException extends RuleViolationException {

    public UnsupportedSensoryRatingException() {
        super(ErrorCode.INVALID_REQUEST_BODY, "향수·클렌징 제품에는 수분감·유분감 평가를 남길 수 없습니다.");
    }
}
