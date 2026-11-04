package com.poudy.routine.domain;

import com.poudy.skintype.domain.SkinType;
import java.time.OffsetDateTime;

public record RoutineCommentView(
    long id,
    String content,
    OffsetDateTime createdAt,
    String authorNickname,
    String authorProfileImageUrl,
    SkinType authorSkinType,
    boolean byRoutineAuthor,
    boolean mine) {
}
