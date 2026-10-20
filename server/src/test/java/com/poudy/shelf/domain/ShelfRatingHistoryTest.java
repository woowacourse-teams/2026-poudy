package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("선반 평가 이력")
class ShelfRatingHistoryTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 20);
    private static final RaterProfile OILY_TWENTIES = new RaterProfile("FEMALE", "TWENTIES", "OILY", false);
    private static final RaterProfile DRY_THIRTIES = new RaterProfile("FEMALE", "THIRTIES", "DRY", false);
    private static final RaterProfile COMBINATION_THIRTIES = new RaterProfile(
        "FEMALE",
        "THIRTIES",
        "COMBINATION",
        true
    );
    private static final Rating GOOD = new Rating(RatingPreference.GOOD, 1.5, 2.0);
    private static final Rating BAD = new Rating(RatingPreference.BAD, 1.5, 2.0);

    @Test
    @DisplayName("입력 Map의 순서와 이후 변경에 관계없이 기록 ID로 마지막 평가를 고른다")
    void copiesAndOrdersRecords() {
        Map<Long, ShelfRatingRecord> records = new LinkedHashMap<>();
        records.put(2L, record(BAD, DRY_THIRTIES, TODAY.minusDays(10)));
        records.put(1L, record(GOOD, OILY_TWENTIES, TODAY.minusDays(40)));
        ShelfRatingHistory history = ShelfRatingHistory.of(records);
        ShelfRatingRecord next = record(GOOD, COMBINATION_THIRTIES, TODAY);

        records.clear();
        records.put(3L, next);

        assertThat(history.needsRecord(next)).isTrue();
        assertThat(history.supersededBy(next)).containsExactly(2L);
    }

    @Test
    @DisplayName("기록이 없으면 첫 평가를 남기고 대신할 기록이 없다")
    void recordsFirstRating() {
        ShelfRatingHistory history = ShelfRatingHistory.of(Map.of());
        ShelfRatingRecord next = record(GOOD, OILY_TWENTIES, TODAY);

        assertThat(history.needsRecord(next)).isTrue();
        assertThat(history.supersededBy(next)).isEmpty();
    }

    @Test
    @DisplayName("사용 상태·평가 값·프로필이 마지막 기록과 모두 같으면 남기지 않는다")
    void skipsSameValues() {
        ShelfRatingHistory history = ShelfRatingHistory.of(
            Map.of(1L, record(GOOD, OILY_TWENTIES, TODAY.minusDays(3)))
        );

        assertThat(history.needsRecord(record(GOOD, OILY_TWENTIES, TODAY))).isFalse();
    }

    @Test
    @DisplayName("사용 상태·평가 값·프로필 가운데 하나라도 다르면 남긴다")
    void recordsChangedValues() {
        ShelfRatingHistory history = ShelfRatingHistory.of(Map.of(1L, record(GOOD, OILY_TWENTIES, TODAY)));

        assertThat(history.needsRecord(record(ShelfUsageStatus.USED, GOOD, OILY_TWENTIES, TODAY))).isTrue();
        assertThat(history.needsRecord(record(new Rating(RatingPreference.GOOD, 1.5, 2.5), OILY_TWENTIES, TODAY)))
            .isTrue();
        assertThat(history.needsRecord(record(GOOD, DRY_THIRTIES, TODAY))).isTrue();
    }

    @Test
    @DisplayName("마지막 기록과만 비교해 앞선 다른 프로필의 기록과 같아도 남긴다")
    void comparesWithLastRecordOnly() {
        ShelfRatingHistory history = ShelfRatingHistory.of(
            Map.of(
                1L,
                record(GOOD, OILY_TWENTIES, TODAY.minusYears(5)),
                2L,
                record(BAD, DRY_THIRTIES, TODAY.minusDays(40))
            )
        );

        assertThat(history.needsRecord(record(GOOD, OILY_TWENTIES, TODAY))).isTrue();
    }

    @Test
    @DisplayName("같은 프로필로 다시 평가하면 기간과 상관없이 그 프로필의 최신 기록을 대신한다")
    void supersedesSameProfile() {
        ShelfRatingHistory history = ShelfRatingHistory.of(
            Map.of(1L, record(GOOD, OILY_TWENTIES, TODAY.minusYears(1)))
        );

        assertThat(history.supersededBy(record(BAD, OILY_TWENTIES, TODAY))).containsExactly(1L);
    }

    @Test
    @DisplayName("다른 프로필로 30일이 지나기 전에 다시 평가하면 마지막 기록을 고친 것으로 본다")
    void correctsLastRecordWithinThirtyDays() {
        ShelfRatingHistory history = ShelfRatingHistory.of(
            Map.of(1L, record(GOOD, OILY_TWENTIES, TODAY.minusDays(29)))
        );

        assertThat(history.supersededBy(record(BAD, DRY_THIRTIES, TODAY))).containsExactly(1L);
    }

    @Test
    @DisplayName("다른 프로필로 30일이 지난 뒤 다시 평가하면 이전 기록을 그 프로필의 평가로 남긴다")
    void keepsOtherProfileAfterThirtyDays() {
        ShelfRatingHistory history = ShelfRatingHistory.of(
            Map.of(1L, record(GOOD, OILY_TWENTIES, TODAY.minusDays(30)))
        );

        assertThat(history.supersededBy(record(BAD, DRY_THIRTIES, TODAY))).isEmpty();
    }

    @Test
    @DisplayName("30일 안의 다시 평가는 마지막 기록만 고치고 그보다 앞선 다른 프로필의 평가는 남긴다")
    void correctsOnlyLastRecord() {
        ShelfRatingHistory history = ShelfRatingHistory.of(
            Map.of(
                1L,
                record(GOOD, OILY_TWENTIES, TODAY.minusYears(5)),
                2L,
                record(BAD, DRY_THIRTIES, TODAY.minusDays(10))
            )
        );

        assertThat(history.supersededBy(record(GOOD, COMBINATION_THIRTIES, TODAY))).containsExactly(2L);
    }

    @Test
    @DisplayName("같은 프로필의 기록과 30일 안의 마지막 기록이 다르면 둘 다 대신한다")
    void supersedesSameProfileAndLastRecord() {
        ShelfRatingHistory history = ShelfRatingHistory.of(
            Map.of(
                1L,
                record(GOOD, OILY_TWENTIES, TODAY.minusYears(2)),
                2L,
                record(BAD, DRY_THIRTIES, TODAY.minusDays(10))
            )
        );

        assertThat(history.supersededBy(record(GOOD, OILY_TWENTIES, TODAY))).containsExactlyInAnyOrder(1L, 2L);
    }

    private static ShelfRatingRecord record(Rating rating, RaterProfile profile, LocalDate recordedOn) {
        return record(ShelfUsageStatus.IN_USE, rating, profile, recordedOn);
    }

    private static ShelfRatingRecord record(
        ShelfUsageStatus usageStatus,
        Rating rating,
        RaterProfile profile,
        LocalDate recordedOn
    ) {
        return new ShelfRatingRecord(usageStatus, rating, profile, recordedOn);
    }
}
