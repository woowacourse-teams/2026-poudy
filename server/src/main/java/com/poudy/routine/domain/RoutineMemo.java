package com.poudy.routine.domain;

import com.poudy.exception.ErrorCode;

public final class RoutineMemo {

    private static final int MAX_LENGTH = 200;

    private final String value;

    public RoutineMemo(String value) {
        if (value == null || value.isBlank()) {
            this.value = null;
            return;
        }
        if (value.codePointCount(0, value.length()) > MAX_LENGTH) {
            throw new InvalidRoutineException(ErrorCode.ROUTINE_MEMO_TOO_LONG);
        }
        this.value = value;
    }

    public String value() {
        return value;
    }
}
