package com.poudy.routine.domain;

import java.util.List;

public final class SharedRoutinePage {

    private final List<SharedRoutine> routines;
    private final long totalElements;

    public SharedRoutinePage(List<SharedRoutine> routines, long totalElements) {
        this.routines = List.copyOf(routines);
        this.totalElements = totalElements;
    }

    public List<Long> productIds() {
        return routines.stream().flatMap(routine -> routine.productIds().stream()).distinct().toList();
    }

    public List<SharedRoutine> routines() {
        return routines;
    }

    public long totalElements() {
        return totalElements;
    }
}
