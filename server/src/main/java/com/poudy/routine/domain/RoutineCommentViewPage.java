package com.poudy.routine.domain;

import java.util.List;

public record RoutineCommentViewPage(List<RoutineCommentView> comments, long totalElements, boolean writable) {

    public RoutineCommentViewPage {
        comments = List.copyOf(comments);
    }
}
