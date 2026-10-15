package com.poudy.shelf.domain;

import java.util.Set;

public enum ShelfTab {
    ALL("전체", ShelfUsageStatus.values()),
    IN_USE("사용 중", ShelfUsageStatus.IN_USE),
    USED("사용했던", ShelfUsageStatus.USED);

    private final String displayName;
    private final Set<ShelfUsageStatus> usageStatuses;

    ShelfTab(String displayName, ShelfUsageStatus... usageStatuses) {
        this.displayName = displayName;
        this.usageStatuses = Set.of(usageStatuses);
    }

    public String displayName() {
        return displayName;
    }

    public boolean includes(ShelfUsageStatus usageStatus) {
        return usageStatuses.contains(usageStatus);
    }
}
