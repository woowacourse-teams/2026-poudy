package com.poudy.feedback.domain;

public class InvalidFeedbackImageIdException extends IllegalArgumentException {

    public InvalidFeedbackImageIdException() {
        super("사용할 수 없는 의견 이미지 ID입니다.");
    }
}
