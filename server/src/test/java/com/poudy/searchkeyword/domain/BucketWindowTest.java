package com.poudy.searchkeyword.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

class BucketWindowTest {

    private static final Instant LATEST = Instant.parse("2026-09-11T10:30:00Z");
    private final BucketWindow window = new BucketWindow(168, 600);

    @Test
    void alignsInstantsToTenMinuteStarts() {
        assertThat(window.startOf(Instant.parse("2026-09-11T10:39:59Z"))).isEqualTo(LATEST);
        assertThat(window.isStart(LATEST)).isTrue();
        assertThat(window.isStart(LATEST.plusSeconds(1))).isFalse();
    }

    @Test
    void coversCompletedWeekAndTheBucketInProgress() {
        Instant oldest = LATEST.minus(168, ChronoUnit.HOURS);
        assertThat(window.oldestStart(LATEST)).isEqualTo(oldest);
        assertThat(window.covers(LATEST, oldest)).isTrue();
        assertThat(window.covers(LATEST, LATEST)).isTrue();
        assertThat(window.covers(LATEST, oldest.minusSeconds(600))).isFalse();
        assertThat(window.covers(LATEST, LATEST.plusSeconds(600))).isFalse();
        assertThat(window.canRetain(1_009)).isTrue();
        assertThat(window.canRetain(1_010)).isFalse();
    }

    @Test
    void countsDownToTheNextStart() {
        assertThat(window.untilNextStart(LATEST)).isEqualTo(Duration.ofMinutes(10));
        assertThat(window.untilNextStart(LATEST.plusSeconds(599))).isEqualTo(Duration.ofSeconds(1));
    }

    @Test
    void rejectsEmptyWindowsAndBucketsThatDoNotDivideAnHour() {
        assertThatThrownBy(() -> new BucketWindow(0, 600)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new BucketWindow(1, 7)).isInstanceOf(IllegalArgumentException.class);
    }
}
