package com.poudy.routine.domain;

import java.util.List;

public record RoutineViewPage(List<OwnedRoutineView> items, long totalElements) {

    public RoutineViewPage {
        items = List.copyOf(items);
    }
}
