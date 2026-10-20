package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@DisplayName("선반 평가 기록")
class ShelfRatingRecordTest {

    @ParameterizedTest
    @CsvSource({"0, true", "29, true", "30, false", "31, false"})
    @DisplayName("두 기록의 날짜 차이가 30일 미만일 때만 수정 기간이다")
    void determinesCorrectionPeriod(int days, boolean withinPeriod) {
        LocalDate recordedOn = LocalDate.of(2026, 10, 20);
        ShelfRatingRecord earlier = record(recordedOn);
        ShelfRatingRecord later = record(recordedOn.plusDays(days));

        assertThat(earlier.isWithinCorrectionPeriod(later)).isEqualTo(withinPeriod);
    }

    private static ShelfRatingRecord record(LocalDate recordedOn) {
        return new ShelfRatingRecord(
            ShelfUsageStatus.IN_USE,
            new Rating(RatingPreference.GOOD, 1.5, 2.0),
            new RaterProfile("FEMALE", "TWENTIES", "OILY", false),
            recordedOn
        );
    }
}
