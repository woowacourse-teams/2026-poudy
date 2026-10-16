package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("선반 제품")
class ShelfProductTest {

    private static final OffsetDateTime REGISTERED_AT = OffsetDateTime.parse("2026-10-14T10:00:00+09:00");

    @Test
    @DisplayName("전체 탭과 자기 사용 상태의 탭에만 속한다")
    void belongsToTabsOfItsUsageStatus() {
        ShelfProduct inUse = new ShelfProduct(1L, ShelfUsageStatus.IN_USE, new Rating(null, null, null), REGISTERED_AT);

        assertThat(inUse.belongsTo(ShelfTab.ALL)).isTrue();
        assertThat(inUse.belongsTo(ShelfTab.IN_USE)).isTrue();
        assertThat(inUse.belongsTo(ShelfTab.USED)).isFalse();
    }

    @Test
    @DisplayName("안 맞았어요로 평가한 제품만 안 맞은 제품이다")
    void isRatedBadOnlyWithBadPreference() {
        assertThat(shelfProductRated(RatingPreference.BAD).isRatedBad()).isTrue();
        assertThat(shelfProductRated(RatingPreference.GOOD).isRatedBad()).isFalse();
        assertThat(shelfProductRated(null).isRatedBad()).isFalse();
    }

    @Test
    @DisplayName("호불호가 달라질 때만 평가가 바뀐 것이고, 사용 상태와 수분감·유분감은 보지 않는다")
    void changesPreferenceOnlyWhenPreferenceDiffers() {
        ShelfProduct bad = new ShelfProduct(
            1L,
            ShelfUsageStatus.IN_USE,
            new Rating(RatingPreference.BAD, 1.0, 2.0),
            REGISTERED_AT
        );

        assertThat(bad.changesPreferenceTo(new Rating(RatingPreference.BAD, null, 3.0))).isFalse();
        assertThat(bad.changesPreferenceTo(new Rating(RatingPreference.GOOD, 1.0, 2.0))).isTrue();
        assertThat(bad.changesPreferenceTo(new Rating(null, 1.0, 2.0))).isTrue();
        assertThat(shelfProductRated(null).changesPreferenceTo(new Rating(null, 2.0, null))).isFalse();
    }

    private ShelfProduct shelfProductRated(RatingPreference preference) {
        return new ShelfProduct(1L, ShelfUsageStatus.USED, new Rating(preference, null, null), REGISTERED_AT);
    }
}
