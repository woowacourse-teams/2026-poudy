package com.poudy.notice.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidNoticeException extends RuleViolationException {
    public InvalidNoticeException() {
        super(ErrorCode.INVALID_REQUEST_BODY, "공지 입력값이 올바르지 않습니다.");
    }
}
