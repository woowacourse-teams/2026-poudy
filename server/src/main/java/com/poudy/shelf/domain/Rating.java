package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.util.Objects;

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

    public void validateFor(Product product) {
        if (!product.supportsSensory() && (moistureLevel != null || oilLevel != null)) {
            throw new UnsupportedSensoryRatingException();
        }
    }

    public Rating withoutSensory() {
        return new Rating(preference, null, null);
    }

    public boolean isBad() {
        return preference == RatingPreference.BAD;
    }

    public boolean isGood() {
        return preference == RatingPreference.GOOD;
    }

    public boolean hasSamePreferenceAs(Rating other) {
        return preference == other.preference;
    }

    public boolean hasSameValuesAs(Rating other) {
        return hasSamePreferenceAs(other)
            && Objects.equals(moistureLevel, other.moistureLevel)
            && Objects.equals(oilLevel, other.oilLevel);
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
