package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
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

    public static ShelfProduct assumed(long productId, RatingPreference preference) {
        return new ShelfProduct(
            productId,
            ShelfUsageStatus.IN_USE,
            new Rating(preference, null, null),
            OffsetDateTime.now()
        );
    }

    public ShelfProduct withPreference(RatingPreference preference) {
        return new ShelfProduct(productId, usageStatus, rating.withPreference(preference), registeredAt);
    }

    public boolean holds(long productId) {
        return this.productId == productId;
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

    public void validateRatingFor(Product product) {
        rating.validateFor(product);
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

    public Rating ratingFor(Product product) {
        if (!product.supportsSensory()) {
            return rating.withoutSensory();
        }
        return rating;
    }

    public OffsetDateTime registeredAt() {
        return registeredAt;
    }
}
