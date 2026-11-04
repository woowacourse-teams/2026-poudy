package com.poudy.routine.domain;

import com.poudy.skintype.domain.SkinType;
import java.util.UUID;

public record RoutineCommentAuthor(long id, String nickname, UUID profileImageId, SkinType skinType) {
}
