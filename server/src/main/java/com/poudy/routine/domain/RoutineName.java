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

    public RoutineName importedFrom(String authorNickname) {
        String imported = authorNickname + " - " + value;
        int end = imported.offsetByCodePoints(0, Math.min(MAX_LENGTH, imported.codePointCount(0, imported.length())));
        return new RoutineName(imported.substring(0, end));
    }

    public String value() {
        return value;
    }
}
