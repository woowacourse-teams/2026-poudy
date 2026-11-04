package com.poudy.routine.domain;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public final class RoutineComment {

    private final long id;
    private final String content;
    private final OffsetDateTime createdAt;
    private final RoutineCommentAuthor author;
    private final long routineAuthorId;

    public RoutineComment(
        long id,
        String content,
        OffsetDateTime createdAt,
        RoutineCommentAuthor author,
        long routineAuthorId
    ) {
        this.id = id;
        this.content = content;
        this.createdAt = createdAt;
        this.author = author;
        this.routineAuthorId = routineAuthorId;
    }

    public boolean isWrittenBy(Long viewerId) {
        return viewerId != null && author.id() == viewerId;
    }

    public boolean isByRoutineAuthor() {
        return author.id() == routineAuthorId;
    }

    public Optional<UUID> authorProfileImageId() {
        return Optional.ofNullable(author.profileImageId());
    }

    public RoutineCommentView viewFor(Long viewerId, String authorProfileImageUrl) {
        return new RoutineCommentView(
            id,
            content,
            createdAt,
            author.nickname(),
            authorProfileImageUrl,
            author.skinType(),
            isByRoutineAuthor(),
            isWrittenBy(viewerId)
        );
    }
}
