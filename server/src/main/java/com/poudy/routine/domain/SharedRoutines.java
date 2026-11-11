package com.poudy.routine.domain;

import java.util.List;

public final class SharedRoutines {

    private final List<SharedRoutine> routines;

    public SharedRoutines(List<SharedRoutine> routines) {
        this.routines = List.copyOf(routines);
    }

    public List<Long> productIds() {
        return routines.stream().flatMap(routine -> routine.productIds().stream()).distinct().toList();
    }

    public List<SharedRoutine> routines() {
        return routines;
    }
}
