package com.poudy.image.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidImageIdException extends RuleViolationException {

    public InvalidImageIdException() {
        super(ErrorCode.INVALID_FEEDBACK_IMAGE_ID, "사용할 수 없는 이미지 ID입니다.");
    }
}
