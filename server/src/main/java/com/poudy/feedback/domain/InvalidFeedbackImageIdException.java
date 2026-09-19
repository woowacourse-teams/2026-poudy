package com.poudy.feedback.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidFeedbackImageIdException extends RuleViolationException {

    public InvalidFeedbackImageIdException() {
        super(ErrorCode.INVALID_FEEDBACK_IMAGE_ID, "사용할 수 없는 의견 이미지 ID입니다.");
    }
}
