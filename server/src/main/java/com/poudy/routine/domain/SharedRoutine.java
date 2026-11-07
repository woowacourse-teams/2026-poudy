package com.poudy.routine.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class SharedRoutine {

    private final Routine routine;
    private final RoutineAuthor author;
    private final RoutineReactions reactions;

    public SharedRoutine(Routine routine, RoutineAuthor author, RoutineReactions reactions) {
        this.routine = routine;
        this.author = author;
        this.reactions = reactions;
    }

    public List<Long> productIds() {
        return routine.productIds();
    }

    public Optional<UUID> authorProfileImageId() {
        return Optional.ofNullable(author.profileImageId());
    }

    public RoutineName importedName() {
        return routine.importedNameBy(author.nickname());
    }

    public SharedRoutineView resolve(Products catalog, String authorProfileImageUrl) {
        RoutineView view = routine.resolve(catalog);
        return new SharedRoutineView(
            view.id(),
            view.name(),
            view.memo(),
            author.nickname(),
            authorProfileImageUrl,
            author.skinType(),
            reactions.likeCount(),
            reactions.commentCount(),
            view.morning(),
            view.evening()
        );
    }
}
