package com.poudy.shelf.domain;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class ShelfRatingRecord {

    private static final long CORRECTION_DAYS = 30;

    private final ShelfUsageStatus usageStatus;
    private final Rating rating;
    private final RaterProfile profile;
    private final LocalDate recordedOn;

    public ShelfRatingRecord(ShelfUsageStatus usageStatus, Rating rating, RaterProfile profile, LocalDate recordedOn) {
        this.usageStatus = usageStatus;
        this.rating = rating;
        this.profile = profile;
        this.recordedOn = recordedOn;
    }

    public boolean hasSameValuesAs(ShelfRatingRecord other) {
        return usageStatus == other.usageStatus && rating.hasSameValuesAs(other.rating) && hasSameProfileAs(other);
    }

    public boolean hasSameProfileAs(ShelfRatingRecord other) {
        return profile.hasSameValuesAs(other.profile);
    }

    public boolean isWithinCorrectionPeriod(ShelfRatingRecord later) {
        return ChronoUnit.DAYS.between(recordedOn, later.recordedOn) < CORRECTION_DAYS;
    }

    public ShelfUsageStatus usageStatus() {
        return usageStatus;
    }

    public RatingPreference preference() {
        return rating.preference();
    }

    public Double moistureLevel() {
        return rating.moistureLevel();
    }

    public Double oilLevel() {
        return rating.oilLevel();
    }

    public String gender() {
        return profile.gender();
    }

    public String ageRange() {
        return profile.ageRange();
    }

    public String skinType() {
        return profile.skinType();
    }

    public Boolean sensitiveSkin() {
        return profile.sensitiveSkin();
    }

    public LocalDate recordedOn() {
        return recordedOn;
    }
}
