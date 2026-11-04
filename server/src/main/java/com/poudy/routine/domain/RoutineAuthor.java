package com.poudy.routine.domain;

import com.poudy.skintype.domain.SkinType;
import java.util.UUID;

public record RoutineAuthor(String nickname, UUID profileImageId, SkinType skinType) {
}
