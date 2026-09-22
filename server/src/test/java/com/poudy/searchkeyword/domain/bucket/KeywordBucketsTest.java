package com.poudy.searchkeyword.domain.bucket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.searchkeyword.support.InMemoryKeywordCountStore;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class KeywordBucketsTest {

    private static final Instant START = Instant.parse("2026-09-06T10:30:00Z");
    private final MutableClock clock = new MutableClock(START);
    private final InMemoryKeywordCountStore store = new InMemoryKeywordCountStore();

    @ParameterizedTest
    @CsvSource({
            "30,10:02:59,10:03:00",
            "60,10:00:59,10:01:00",
            "180,10:02:59,10:03:00",
            "600,10:09:59,10:10:00"
    })
    void alignsBucketsToEpochBoundariesForSupportedDurations(int seconds, String before, String after) {
        MutableClock durationClock = new MutableClock(Instant.parse("2026-09-06T" + before + "Z"));
        KeywordBuckets buckets = new KeywordBuckets(durationClock, new BucketWindow(1, seconds, 0), store);
        buckets.record("토너");
        durationClock.set(Instant.parse("2026-09-06T" + after + "Z"));
        buckets.record("크림");
        assertThat(store.bucketCount()).isEqualTo(2);
        assertThat(buckets.view().counts()).containsOnlyKeys("토너");
    }

    @Test
    void viewExcludesTheBucketInProgressUntilItsBoundary() {
        KeywordBuckets buckets = buckets(new BucketWindow(168, 600, 0));
        buckets.record("토너");
        clock.set(START.plus(9, ChronoUnit.MINUTES).plusSeconds(59));
        assertThat(buckets.view().counts()).isEmpty();
        clock.set(START.plus(10, ChronoUnit.MINUTES));
        assertThat(buckets.view().counts()).containsEntry("토너", 1L);
    }

    @Test
    void keepsSingleSpacesInKeysAndRejectsUnnormalizedKeys() {
        KeywordBuckets buckets = buckets(new BucketWindow(168, 600, 0));
        buckets.record("독도 토너");
        clock.set(START.plus(10, ChronoUnit.MINUTES));
        assertThat(buckets.view().counts()).containsEntry("독도 토너", 1L);
        assertThatThrownBy(() -> buckets.record("독도  토너")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> buckets.record(" PDRN ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> buckets.record("가".repeat(301))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void comparisonWindowNeedsObservationBeforeThePreviousBoundary() {
        KeywordBuckets buckets = buckets(new BucketWindow(1, 600, 1));
        buckets.record("토너");

        assertThat(buckets.comparisonView()).isEmpty();
        clock.set(START.plus(10, ChronoUnit.MINUTES));
        assertThat(buckets.comparisonView()).isEmpty();
        clock.set(START.plus(20, ChronoUnit.MINUTES));
        assertThat(buckets.comparisonView()).isPresent();
        assertThat(buckets(new BucketWindow(168, 600, 0)).comparisonView()).isEmpty();
    }

    @Test
    void comparisonUsesBucketsSavedBeforeARestart() {
        buckets(new BucketWindow(1, 600, 1)).record("토너");
        clock.set(START.plus(20, ChronoUnit.MINUTES));

        KeywordBuckets restarted = buckets(new BucketWindow(1, 600, 1));

        assertThat(restarted.comparisonView()).hasValueSatisfying(
            compared -> assertThat(compared.counts()).containsExactlyInAnyOrderEntriesOf(Map.of("토너", 1L))
        );
    }

    @Test
    void comparisonWindowSumsTheSameWindowOneBucketEarlier() {
        KeywordBuckets buckets = buckets(new BucketWindow(1, 600, 1));
        buckets.record("토너");
        clock.set(START.plus(10, ChronoUnit.MINUTES));
        buckets.record("크림");
        clock.set(START.plus(20, ChronoUnit.MINUTES));

        assertThat(buckets.comparisonView()).hasValueSatisfying(
            compared -> assertThat(compared.counts()).containsExactlyInAnyOrderEntriesOf(Map.of("토너", 1L))
        );
        assertThat(buckets.view().counts()).containsExactlyInAnyOrderEntriesOf(Map.of("토너", 1L, "크림", 1L));
    }

    @Test
    void retainsOnlyOneExtraBucketForTheComparison() {
        KeywordBuckets buckets = buckets(new BucketWindow(1, 600, 1));
        buckets.record("토너");
        clock.set(START.plus(70, ChronoUnit.MINUTES));
        assertThat(buckets.view().counts()).isEmpty();
        assertThat(buckets.comparisonView()).hasValueSatisfying(
            compared -> assertThat(compared.counts()).containsExactlyInAnyOrderEntriesOf(Map.of("토너", 1L))
        );
        clock.set(START.plus(80, ChronoUnit.MINUTES));
        buckets.view();
        assertThat(store.bucketCount()).isZero();
    }

    @Test
    void windowHoldsExactly168HoursOfCompletedBuckets() {
        KeywordBuckets buckets = buckets(new BucketWindow(168, 600, 0));
        buckets.record("토너");
        clock.set(START.plus(168, ChronoUnit.HOURS));
        assertThat(buckets.view().counts()).containsEntry("토너", 1L);
        clock.set(START.plus(168, ChronoUnit.HOURS).plus(10, ChronoUnit.MINUTES));
        assertThat(buckets.view().counts()).isEmpty();
        assertThat(store.bucketCount()).isZero();
    }

    @ParameterizedTest
    @CsvSource({"30", "60", "180", "600"})
    void windowExpiresExactlyAtConfiguredDuration(int seconds) {
        MutableClock durationClock = new MutableClock(Instant.parse("2026-09-06T10:00:00Z"));
        KeywordBuckets buckets = new KeywordBuckets(durationClock, new BucketWindow(1, seconds, 0), store);
        buckets.record("토너");
        durationClock.set(Instant.parse("2026-09-06T11:00:00Z").plusSeconds(seconds - 1));
        assertThat(buckets.view().counts()).containsEntry("토너", 1L);
        durationClock.set(Instant.parse("2026-09-06T11:00:00Z").plusSeconds(seconds));
        assertThat(buckets.view().counts()).isEmpty();
    }

    @Test
    void multipleInputsAcrossBucketsAreSummed() {
        KeywordBuckets buckets = buckets(new BucketWindow(168, 600, 0));
        buckets.record("토너");
        buckets.record("크림");
        buckets.record("토너");
        clock.set(START.plus(1, ChronoUnit.HOURS));
        buckets.record("크림");
        clock.set(START.plus(1, ChronoUnit.HOURS).plus(10, ChronoUnit.MINUTES));
        assertThat(buckets.view().counts()).containsExactlyInAnyOrderEntriesOf(Map.of("토너", 2L, "크림", 2L));
    }

    private KeywordBuckets buckets(BucketWindow window) {
        return new KeywordBuckets(clock, window, store);
    }

    private static final class MutableClock extends Clock {
        private volatile Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        private void set(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
