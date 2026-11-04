package com.poudy.routine.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidRoutineException extends RuleViolationException {

    public InvalidRoutineException(ErrorCode code) {
        super(code, code.message());
    }
}
