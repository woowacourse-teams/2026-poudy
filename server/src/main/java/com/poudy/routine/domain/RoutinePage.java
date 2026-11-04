package com.poudy.routine.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Map;

public final class RoutinePage {

    private final List<Routine> routines;
    private final Map<Long, RoutineReactions> reactions;
    private final long totalElements;

    public RoutinePage(List<Routine> routines, Map<Long, RoutineReactions> reactions, long totalElements) {
        this.routines = List.copyOf(routines);
        this.reactions = Map.copyOf(reactions);
        this.totalElements = totalElements;
    }

    public List<Long> productIds() {
        return routines.stream().flatMap(routine -> routine.productIds().stream()).distinct().toList();
    }

    public List<OwnedRoutineView> resolve(Products catalog) {
        return routines.stream()
            .map(routine -> ownedViewOf(routine.resolve(catalog)))
            .toList();
    }

    private OwnedRoutineView ownedViewOf(RoutineView view) {
        RoutineReactions counts = reactions.get(view.id());
        return new OwnedRoutineView(
            view.id(),
            view.name(),
            view.isPublic(),
            counts.likeCount(),
            counts.commentCount(),
            view.morning(),
            view.evening()
        );
    }

    public long totalElements() {
        return totalElements;
    }
}
