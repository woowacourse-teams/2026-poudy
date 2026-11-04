package com.poudy.routine.domain;

import java.util.List;

public record SharedRoutineViewPage(List<SharedRoutineView> items, long totalElements) {

    public SharedRoutineViewPage {
        items = List.copyOf(items);
    }
}
