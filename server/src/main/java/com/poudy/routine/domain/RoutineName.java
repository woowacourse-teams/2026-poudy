package com.poudy.routine.domain;

import com.poudy.exception.ErrorCode;

public final class RoutineName {

    private static final int MAX_LENGTH = 25;

    private final String value;

    public RoutineName(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidRoutineException(ErrorCode.INVALID_ROUTINE_NAME);
        }
        String stripped = value.strip();
        if (stripped.codePointCount(0, stripped.length()) > MAX_LENGTH) {
            throw new InvalidRoutineException(ErrorCode.ROUTINE_NAME_TOO_LONG);
        }
        this.value = stripped;
    }

    public String value() {
        return value;
    }
}
