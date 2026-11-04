package com.poudy.routine.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class SharedRoutine {

    private final Routine routine;
    private final String authorNickname;
    private final UUID authorProfileImageId;

    public SharedRoutine(Routine routine, String authorNickname, UUID authorProfileImageId) {
        this.routine = routine;
        this.authorNickname = authorNickname;
        this.authorProfileImageId = authorProfileImageId;
    }

    public List<Long> productIds() {
        return routine.productIds();
    }

    public Optional<UUID> authorProfileImageId() {
        return Optional.ofNullable(authorProfileImageId);
    }

    public RoutineName importedName() {
        return routine.importedNameBy(authorNickname);
    }

    public SharedRoutineView resolve(Products catalog, String authorProfileImageUrl) {
        RoutineView view = routine.resolve(catalog);
        return new SharedRoutineView(
            view.id(),
            view.name(),
            authorNickname,
            authorProfileImageUrl,
            view.morning(),
            view.evening()
        );
    }
}
