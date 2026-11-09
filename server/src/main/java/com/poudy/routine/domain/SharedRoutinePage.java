package com.poudy.routine.domain;

import java.util.List;

public final class SharedRoutinePage {

    private final SharedRoutines routines;
    private final long totalElements;

    public SharedRoutinePage(SharedRoutines routines, long totalElements) {
        this.routines = routines;
        this.totalElements = totalElements;
    }

    public List<Long> productIds() {
        return routines.productIds();
    }

    public List<SharedRoutine> routines() {
        return routines.routines();
    }

    public long totalElements() {
        return totalElements;
    }
}
