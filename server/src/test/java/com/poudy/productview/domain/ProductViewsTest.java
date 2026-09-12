package com.poudy.productview.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;

class ProductViewsTest {

    @Test
    void recordsOnKoreanCalendarAndRetainsAllHistory() {
        Clock clock = mock(Clock.class);
        when(clock.withZone(ZoneId.of("Asia/Seoul"))).thenReturn(clock);
        when(clock.getZone()).thenReturn(ZoneId.of("Asia/Seoul"));
        when(clock.instant()).thenReturn(Instant.parse("2026-09-11T14:59:59Z"));
        ProductViews views = new ProductViews(
            clock,
            new ProductViewSnapshot(
                0,
                Map.of(
                    LocalDate.of(2020, 1, 1),
                    Map.of(1L, 10L),
                    LocalDate.of(2026, 9, 5),
                    Map.of(1L, 20L),
                    LocalDate.of(2026, 9, 6),
                    Map.of(1L, 30L)
                )
            )
        );
        views.record(1L);
        when(clock.instant()).thenReturn(Instant.parse("2026-09-11T15:00:00Z"));
        views.record(1L);
        views.record(2L);

        assertThat(views.totals(1)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 1L, 2L, 1L));
        assertThat(views.totals(7)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 32L, 2L, 1L));
        assertThat(views.totals(null)).containsExactlyInAnyOrderEntriesOf(Map.of(1L, 62L, 2L, 1L));
        assertThat(views.totals(Integer.MAX_VALUE)).containsEntry(1L, 62L);
        assertThatIllegalArgumentException().isThrownBy(() -> views.totals(0));
        assertThatIllegalArgumentException().isThrownBy(() -> views.totals(-1));
    }

    @Test
    void concurrentRecordsAreNotLostAndSnapshotsStayImmutable() throws Exception {
        ProductViews views = new ProductViews(Clock.systemUTC(), new ProductViewSnapshot(0, Map.of()));
        assertThat(views.changedSince(0)).isEmpty();
        views.record(1L);
        ProductViewSnapshot before = views.changedSince(0).orElseThrow();
        try (var executor = Executors.newFixedThreadPool(8)) {
            List<Future<?>> tasks = new ArrayList<>();
            for (int worker = 0; worker < 8; worker++) {
                tasks.add(executor.submit(() -> {
                    for (int count = 0; count < 1000; count++) {
                        views.record(1L);
                    }
                }));
            }
            for (Future<?> task : tasks) {
                task.get();
            }
        }
        assertThat(views.totals(null)).containsEntry(1L, 8001L);
        assertThat(before.totals(LocalDate.now(), null)).containsEntry(1L, 1L);
        assertThatThrownBy(() -> before.dailyCounts().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> before.dailyCounts().values().iterator().next().clear())
            .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void boundedPeriodExcludesFutureDatesAfterClockMovesBack() {
        ProductViews views = new ProductViews(
            Clock.fixed(Instant.parse("2026-09-11T15:00:00Z"), ZoneId.of("UTC")),
            new ProductViewSnapshot(0, Map.of(LocalDate.of(2026, 9, 13), Map.of(1L, 3L)))
        );
        assertThat(views.totals(7)).isEmpty();
        assertThat(views.totals(null)).containsEntry(1L, 3L);
    }
}
