package com.poudy.routine.domain;

import java.util.List;

public record RoutineCommentPage(List<RoutineComment> comments, long totalElements) {

    public RoutineCommentPage {
        comments = List.copyOf(comments);
    }
}
