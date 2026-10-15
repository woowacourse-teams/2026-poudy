package com.poudy.shelf.domain;

public final class Rating {

    private static final double MAX_LEVEL = 3;
    private static final double LEVEL_STEP = 0.5;

    private final RatingPreference preference;
    private final Double moistureLevel;
    private final Double oilLevel;

    public Rating(RatingPreference preference, Double moistureLevel, Double oilLevel) {
        if (isInvalidLevel(moistureLevel) || isInvalidLevel(oilLevel)) {
            throw new InvalidRatingException();
        }
        this.preference = preference;
        this.moistureLevel = moistureLevel;
        this.oilLevel = oilLevel;
    }

    private static boolean isInvalidLevel(Double level) {
        if (level == null) {
            return false;
        }
        return level < 0 || level > MAX_LEVEL || level % LEVEL_STEP != 0;
    }

    public boolean isBad() {
        return preference == RatingPreference.BAD;
    }

    public RatingPreference preference() {
        return preference;
    }

    public Double moistureLevel() {
        return moistureLevel;
    }

    public Double oilLevel() {
        return oilLevel;
    }
}
