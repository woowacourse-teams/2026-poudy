package com.poudy.shelf.domain;

import java.time.OffsetDateTime;

public final class ShelfProduct {

    private final long productId;
    private final ShelfUsageStatus usageStatus;
    private final Rating rating;
    private final OffsetDateTime registeredAt;

    public ShelfProduct(long productId, ShelfUsageStatus usageStatus, Rating rating, OffsetDateTime registeredAt) {
        this.productId = productId;
        this.usageStatus = usageStatus;
        this.rating = rating;
        this.registeredAt = registeredAt;
    }

    public boolean belongsTo(ShelfTab tab) {
        return tab.includes(usageStatus);
    }

    public boolean isRatedBad() {
        return rating.isBad();
    }

    public boolean isRatedGood() {
        return rating.isGood();
    }

    public boolean changesPreferenceTo(Rating next) {
        return !rating.hasSamePreferenceAs(next);
    }

    public long productId() {
        return productId;
    }

    public ShelfUsageStatus usageStatus() {
        return usageStatus;
    }

    public Rating rating() {
        return rating;
    }

    public OffsetDateTime registeredAt() {
        return registeredAt;
    }
}
