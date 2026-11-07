package com.poudy.shelf.domain;

public final class GuestRating {

    private final long productId;
    private final RatingPreference preference;

    public GuestRating(long productId, RatingPreference preference) {
        this.productId = productId;
        this.preference = preference;
    }

    public long productId() {
        return productId;
    }

    public boolean isBad() {
        return preference == RatingPreference.BAD;
    }

    public boolean isGood() {
        return preference == RatingPreference.GOOD;
    }
}
