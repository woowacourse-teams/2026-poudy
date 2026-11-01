package com.poudy.user.domain;

import java.util.List;
import java.util.UUID;

public record WithdrawnUserPurge(int deletedCount, List<UUID> profileImageIds) {

    public WithdrawnUserPurge {
        profileImageIds = List.copyOf(profileImageIds);
    }
}
