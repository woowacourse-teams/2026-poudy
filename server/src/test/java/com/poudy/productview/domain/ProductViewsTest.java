package com.poudy.productview.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProductViewsTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 12);

    @Test
    void increasesByDateAndSumsRequestedPeriodIncludingToday() {
        ProductViews productViews = ProductViews.from(
            Map.of(
                LocalDate.of(2020, 1, 1),
                Map.of(1L, 10L),
                TODAY.minusDays(7),
                Map.of(1L, 20L),
                TODAY.minusDays(6),
                Map.of(1L, 30L)
            )
        );
        productViews.increaseViewCount(1L, TODAY.minusDays(1));
        productViews.increaseViewCount(1L, TODAY);
        productViews.increaseViewCount(2L, TODAY);

        assertThat(productViews.sumViewCounts(TODAY, 1)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 1L, 2L, 1L));
        assertThat(productViews.sumViewCounts(TODAY, 7)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 32L, 2L, 1L));
        assertThat(productViews.sumViewCounts(TODAY, null)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 62L, 2L, 1L));
        assertThat(productViews.sumViewCounts(TODAY, Integer.MAX_VALUE)).containsEntry(1L, 62L);
        assertThatIllegalArgumentException().isThrownBy(() -> productViews.sumViewCounts(TODAY, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> productViews.sumViewCounts(TODAY, -1));
    }

    @Test
    void inputChangesAndLaterIncreasesDoNotChangeCopies() {
        Map<Long, Long> counts = new HashMap<>(Map.of(1L, 2L));
        Map<LocalDate, Map<Long, Long>> dailyCounts = new HashMap<>(Map.of(TODAY, counts));
        ProductViews productViews = ProductViews.from(dailyCounts);
        counts.put(1L, 100L);
        dailyCounts.clear();
        assertThat(productViews.sumViewCounts(TODAY, null)).containsEntry(1L, 2L);

        ProductViews copy = productViews.copy();
        productViews.increaseViewCount(1L, TODAY);
        copy.increaseViewCount(2L, TODAY);
        assertThat(copy.sumViewCounts(TODAY, null)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 2L, 2L, 1L));
        assertThat(productViews.sumViewCounts(TODAY, null)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 3L));
    }

    @Test
    void exportedCountsAreImmutableAndDetached() {
        ProductViews productViews = ProductViews.from(Map.of(TODAY, Map.of(1L, 1L)));
        Map<LocalDate, Map<Long, Long>> exported = productViews.dailyCounts();
        productViews.increaseViewCount(1L, TODAY);
        assertThat(exported.get(TODAY)).containsEntry(1L, 1L);
        assertThatThrownBy(exported::clear).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> exported.get(TODAY).clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void boundedPeriodExcludesFutureDatesAndRetainsThemInAllTimeCount() {
        ProductViews productViews = ProductViews.from(Map.of(TODAY.plusDays(1), Map.of(1L, 3L)));
        assertThat(productViews.sumViewCounts(TODAY, 7)).isEmpty();
        assertThat(productViews.sumViewCounts(TODAY, null)).containsEntry(1L, 3L);
    }
}
