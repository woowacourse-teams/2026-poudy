package com.poudy.searchkeyword.domain.bucket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

class BucketWindowTest {

    private static final Instant LATEST = Instant.parse("2026-09-11T10:30:00Z");
    private final BucketWindow window = new BucketWindow(168, 600, 0);

    @Test
    void alignsInstantsToTenMinuteStarts() {
        assertThat(window.startOf(Instant.parse("2026-09-11T10:39:59Z"))).isEqualTo(LATEST);
        assertThat(window.startOf(LATEST)).isEqualTo(LATEST);
    }

    @Test
    void startsWindowOneWeekBeforeLatestBucket() {
        Instant oldest = LATEST.minus(168, ChronoUnit.HOURS);
        assertThat(window.oldestStart(LATEST)).isEqualTo(oldest);
    }

    @Test
    void rejectsEmptyWindowsAndBucketsThatDoNotDivideAnHour() {
        assertThatThrownBy(() -> new BucketWindow(0, 600, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new BucketWindow(1, 7, 0)).isInstanceOf(IllegalArgumentException.class);
    }
}
