package com.poudy.routine.domain;

import com.poudy.exception.ErrorCode;

public final class RoutineCommentContent {

    private static final int MAX_LENGTH = 300;

    private final String value;

    public RoutineCommentContent(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidRoutineException(ErrorCode.INVALID_ROUTINE_COMMENT);
        }
        String stripped = value.strip();
        if (stripped.codePointCount(0, stripped.length()) > MAX_LENGTH) {
            throw new InvalidRoutineException(ErrorCode.ROUTINE_COMMENT_TOO_LONG);
        }
        this.value = stripped;
    }

    public String value() {
        return value;
    }
}
