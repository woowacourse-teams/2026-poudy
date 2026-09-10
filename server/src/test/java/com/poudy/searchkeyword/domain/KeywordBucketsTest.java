package com.poudy.searchkeyword.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.searchkeyword.domain.KeywordBuckets.RecordResult;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class KeywordBucketsTest {

    private static final Instant START = Instant.parse("2026-09-06T10:30:00Z");
    private final MutableClock clock = new MutableClock(START);

    @ParameterizedTest
    @CsvSource({"30,10:02:59,10:03:00", "60,10:00:59,10:01:00", "180,10:02:59,10:03:00"})
    void alignsBucketsToEpochBoundariesForSupportedDurations(int seconds, String before, String after) {
        Instant initial = Instant.parse("2026-09-06T" + before + "Z");
        MutableClock durationClock = new MutableClock(initial);
        KeywordBuckets buckets = new KeywordBuckets(durationClock, 1, seconds);
        buckets.record("토너");
        durationClock.set(Instant.parse("2026-09-06T" + after + "Z"));
        buckets.record("크림");
        assertThat(buckets.view().bucketCount()).isEqualTo(2);
        assertThat(buckets.view().counts()).containsEntry("토너", 1L).containsEntry("크림", 1L);
    }

    @Test
    void retainsExactlyCurrentAndPrevious167Hours() {
        KeywordBuckets buckets = new KeywordBuckets(clock, 168);
        buckets.record("토너");
        clock.set(START.plus(167, ChronoUnit.HOURS));
        assertThat(buckets.view().counts()).containsEntry("토너", 1L);
        clock.set(START.plus(168, ChronoUnit.HOURS));
        assertThat(buckets.view().counts()).isEmpty();
        assertThat(buckets.view().uniqueKeyCount()).isZero();
    }

    @Test
    void zeroStoreExpiresIndependentlyAt72Hours() {
        KeywordBuckets ranking = new KeywordBuckets(clock, 168);
        KeywordBuckets zero = new KeywordBuckets(clock, 72);
        ranking.record("토너");
        zero.record("없는제품");
        clock.set(START.plus(72, ChronoUnit.HOURS));
        assertThat(zero.view().counts()).isEmpty();
        assertThat(ranking.view().counts()).containsEntry("토너", 1L);
    }

    @Test
    void multipleInputsInOneBucketRemainRecorded() {
        KeywordBuckets buckets = new KeywordBuckets(clock, 168);
        assertThat(buckets.record("토너")).isEqualTo(RecordResult.RECORDED);
        assertThat(buckets.record("크림")).isEqualTo(RecordResult.RECORDED);
        assertThat(buckets.record("토너")).isEqualTo(RecordResult.RECORDED);
        clock.set(START.plus(1, ChronoUnit.HOURS));
        assertThat(buckets.record("크림")).isEqualTo(RecordResult.RECORDED);
        assertThat(buckets.view().counts()).containsExactlyInAnyOrderEntriesOf(Map.of("토너", 2L, "크림", 2L));
        assertThat(buckets.view().entryCount()).isEqualTo(3);
    }

    @Test
    void moreThanHundredDistinctInputsInOneBucketRemainRecorded() {
        KeywordBuckets buckets = new KeywordBuckets(clock, 1);
        for (int index = 0; index < 1_000; index++) {
            assertThat(buckets.record("입력" + index)).isEqualTo(RecordResult.RECORDED);
        }
        assertThat(buckets.view().entryCount()).isEqualTo(1_000);
    }

    @Test
    void sameHourRegressionIsAcceptedButEarlierBucketFreezesCollectionUntilCatchup() {
        MutableClock regressionClock = new MutableClock(Instant.parse("2026-09-06T10:30:40Z"));
        KeywordBuckets buckets = new KeywordBuckets(regressionClock, 168);
        buckets.record("토너");
        regressionClock.set(Instant.parse("2026-09-06T10:30:20Z"));
        assertThat(buckets.record("토너")).isEqualTo(RecordResult.RECORDED);
        regressionClock.set(Instant.parse("2026-09-06T10:29:59Z"));
        assertThat(buckets.record("토너")).isEqualTo(RecordResult.CLOCK_REGRESSION);
        assertThat(buckets.view().clockRegressed()).isTrue();
        KeywordBucketSnapshot snapshot = buckets.snapshot();
        assertThat(snapshot.savedAt()).isAfterOrEqualTo(snapshot.maxObservedBucketStart());
        assertThat(buckets.view().counts()).containsEntry("토너", 2L);
        regressionClock.set(Instant.parse("2026-09-06T10:30:40Z"));
        assertThat(buckets.record("토너")).isEqualTo(RecordResult.RECORDED);
        assertThat(buckets.view().clockRegressed()).isFalse();
    }

    @Test
    void sameBucketClockRegressionKeepsSnapshotTimestampsValid() {
        MutableClock dropClock = new MutableClock(Instant.parse("2026-09-06T10:30:40Z"));
        KeywordBuckets buckets = new KeywordBuckets(dropClock, 168);
        buckets.record("토너");
        buckets.record("크림");
        dropClock.set(Instant.parse("2026-09-06T10:30:20Z"));
        KeywordBucketSnapshot snapshot = buckets.snapshot();
        assertThat(snapshot.savedAt()).isAfterOrEqualTo(snapshot.maxObservedBucketStart());
        var restored = new KeywordBuckets(clock, 168);
        restored.restore(snapshot);
    }

    @ParameterizedTest
    @CsvSource({"30", "60", "180"})
    void retentionExpiresExactlyAtConfiguredDuration(int seconds) {
        MutableClock durationClock = new MutableClock(Instant.parse("2026-09-06T10:00:00Z"));
        KeywordBuckets buckets = new KeywordBuckets(durationClock, 1, seconds);
        buckets.record("토너");
        durationClock.set(durationClock.instant().plusSeconds(3599));
        assertThat(buckets.view().counts()).containsEntry("토너", 1L);
        durationClock.set(Instant.parse("2026-09-06T11:00:00Z"));
        assertThat(buckets.view().counts()).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({"30", "60", "180"})
    void snapshotAcceptsOldestRetainedBucketAndRejectsOneOlder(int seconds) {
        Instant maximum = Instant.parse("2026-09-06T10:00:00Z");
        int retainedBuckets = 2 * 3600 / seconds;
        Instant oldest = maximum.minus((retainedBuckets - 1L) * seconds, ChronoUnit.SECONDS);
        KeywordBucketSnapshot valid = new KeywordBucketSnapshot(
            maximum,
            maximum,
            List.of(new KeywordBucket(oldest, Map.of("토너", 1L)))
        );
        KeywordBuckets accepted = new KeywordBuckets(Clock.fixed(maximum, ZoneOffset.UTC), 2, seconds);
        accepted.restore(valid);
        Instant tooOld = oldest.minus(seconds, ChronoUnit.SECONDS);
        KeywordBucketSnapshot invalid = new KeywordBucketSnapshot(
            maximum,
            maximum,
            List.of(new KeywordBucket(tooOld, Map.of("토너", 1L)))
        );
        KeywordBuckets rejected = new KeywordBuckets(Clock.fixed(maximum, ZoneOffset.UTC), 2, seconds);
        assertThatThrownBy(() -> rejected.restore(invalid)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void restoringPreservesCountsAndDoesNotReplaySearch() {
        KeywordBuckets original = new KeywordBuckets(clock, 168, 1);
        original.record("토너");
        original.record("토너");
        original.record("크림");
        KeywordBucketSnapshot snapshot = original.snapshot();
        KeywordBuckets restored = new KeywordBuckets(clock, 168, 1);
        restored.restore(snapshot);
        assertThat(restored.view().counts()).containsExactlyInAnyOrderEntriesOf(Map.of("토너", 2L, "크림", 1L));
    }

    @Test
    void restoringInFutureExpiresWhileRegressionKeepsPreviousWindow() {
        KeywordBuckets original = new KeywordBuckets(clock, 168);
        original.record("토너");
        KeywordBucketSnapshot snapshot = original.snapshot();
        clock.set(START.plus(200, ChronoUnit.HOURS));
        KeywordBuckets restored = new KeywordBuckets(clock, 168);
        restored.restore(snapshot);
        assertThat(restored.view().counts()).isEmpty();
        clock.set(START);
        assertThat(restored.record("토너")).isEqualTo(RecordResult.CLOCK_REGRESSION);
        assertThat(restored.view().counts()).isEmpty();
    }

    @Test
    void snapshotsAndViewsAreDetachedFromLaterChanges() {
        KeywordBuckets buckets = new KeywordBuckets(clock, 168);
        buckets.record("토너");
        KeywordBucketSnapshot first = buckets.snapshot();
        var view = buckets.view();
        buckets.record("토너");
        assertThat(view.counts()).containsEntry("토너", 1L);
        assertThatThrownBy(() -> view.counts().put("크림", 1L)).isInstanceOf(UnsupportedOperationException.class);
        assertThat(first.buckets().getFirst().counts()).containsEntry("토너", 1L);
        assertThat(buckets.snapshot().buckets().getFirst().counts()).containsEntry("토너", 2L);
    }

    @Test
    void longOverflowFailsWithoutWrappingOrMutatingCount() {
        KeywordBuckets buckets = new KeywordBuckets(clock, 168);
        Instant hour = START.truncatedTo(ChronoUnit.HOURS).plus(30, ChronoUnit.MINUTES);
        buckets.restore(
            new KeywordBucketSnapshot(
                START,
                hour,
                List.of(new KeywordBucket(hour, Map.of("토너", Long.MAX_VALUE)))
            )
        );
        assertThatThrownBy(() -> buckets.record("토너")).isInstanceOf(ArithmeticException.class);
        assertThat(buckets.view().counts()).containsEntry("토너", Long.MAX_VALUE);
    }

    @Test
    void restoreSumOverflowLeavesStoreUnusedAndUsable() {
        Instant maximum = Instant.parse("2026-09-06T10:30:00Z");
        KeywordBucketSnapshot invalid = new KeywordBucketSnapshot(
            maximum,
            maximum,
            List.of(
                new KeywordBucket(maximum.minus(60, ChronoUnit.SECONDS), Map.of("토너", Long.MAX_VALUE)),
                new KeywordBucket(maximum, Map.of("토너", 1L))
            )
        );
        KeywordBuckets buckets = new KeywordBuckets(Clock.fixed(maximum, ZoneOffset.UTC), 2, 60);
        assertThatThrownBy(() -> buckets.restore(invalid)).isInstanceOf(ArithmeticException.class);
        assertThat(buckets.view().counts()).isEmpty();
        assertThat(buckets.record("토너")).isEqualTo(RecordResult.RECORDED);
    }

    @Test
    void oneMillionConcurrentIncrementsRemainOneEntryWithConsistentSnapshots() throws Exception {
        KeywordBuckets buckets = new KeywordBuckets(clock, 168);
        try (var executor = Executors.newFixedThreadPool(5)) {
            Callable<Void> record = () -> {
                for (int index = 0; index < 250_000; index++) {
                    buckets.record("토너");
                }
                return null;
            };
            List<Future<Void>> writers = List.of(
                executor.submit(record),
                executor.submit(record),
                executor.submit(record),
                executor.submit(record)
            );
            Future<?> reader = executor.submit(() -> {
                for (int index = 0; index < 1000; index++) {
                    KeywordBucketView view = buckets.view();
                    assertThat(view.entryCount()).isLessThanOrEqualTo(1);
                    assertThat(view.uniqueKeyCount()).isEqualTo(view.entryCount());
                    buckets.snapshot();
                    buckets.expire();
                }
            });
            for (Future<Void> writer : writers) {
                writer.get();
            }
            reader.get();
        }
        assertThat(buckets.view().counts()).containsExactlyEntriesOf(Map.of("토너", 1_000_000L));
        assertThat(buckets.view().entryCount()).isOne();
    }

    @Test
    void concurrentDistinctKeysRespectCapacityAndAccountForEveryRejectedAttempt() throws Exception {
        KeywordBuckets buckets = new KeywordBuckets(clock, 168);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(8)) {
            List<Future<?>> tasks = new ArrayList<>();
            for (int worker = 0; worker < 8; worker++) {
                int offset = worker * 100;
                tasks.add(executor.submit(() -> {
                    start.await();
                    for (int index = 0; index < 100; index++) {
                        buckets.record("검색어" + (offset + index));
                    }
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> task : tasks) {
                task.get(10, TimeUnit.SECONDS);
            }
        }
        var view = buckets.view();
        assertThat(view.entryCount()).isEqualTo(800);
        assertThat(view.uniqueKeyCount()).isEqualTo(800);
        assertThat(view.counts().values()).allMatch(count -> count == 1L);
    }

    @Test
    void repeatedKeysAcrossMinuteBucketsRemainAcceptedBeyondFormerGlobalCap() {
        KeywordBuckets buckets = new KeywordBuckets(clock, 24, 60);
        for (int minute = 0; minute < 841; minute++) {
            clock.set(START.plus(minute, ChronoUnit.MINUTES));
            for (int key = 0; key < 20; key++) {
                assertThat(buckets.record("검색어" + key)).isEqualTo(RecordResult.RECORDED);
            }
        }
    }

    @Test
    void concurrentExpiryCollectionAndSnapshotsPreserveWindowAndReferenceCounts() throws Exception {
        KeywordBuckets buckets = new KeywordBuckets(clock, 3);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(5)) {
            List<Future<?>> tasks = new ArrayList<>();
            for (int worker = 0; worker < 4; worker++) {
                tasks.add(executor.submit(() -> {
                    start.await();
                    for (int index = 0; index < 10_000; index++) {
                        assertThat(buckets.record("검색어" + (index % 10))).isEqualTo(RecordResult.RECORDED);
                    }
                    return null;
                }));
            }
            tasks.add(executor.submit(() -> {
                start.await();
                for (int hour = 1; hour <= 200; hour++) {
                    clock.set(START.plus(hour, ChronoUnit.HOURS));
                    buckets.expire();
                    var view = buckets.view();
                    assertThat(view.bucketCount()).isLessThanOrEqualTo(3);
                    assertThat(view.uniqueKeyCount()).isEqualTo(view.counts().size());
                    assertThat(view.entryCount()).isBetween(view.uniqueKeyCount(), 30);
                    var snapshot = buckets.snapshot();
                    var restored = new KeywordBuckets(Clock.fixed(snapshot.savedAt(), ZoneOffset.UTC), 3);
                    restored.restore(snapshot);
                    assertThat(restored.view().uniqueKeyCount()).isEqualTo(restored.view().counts().size());
                }
                return null;
            }));
            start.countDown();
            for (Future<?> task : tasks) {
                task.get(20, TimeUnit.SECONDS);
            }
        }
        clock.set(START.plus(203, ChronoUnit.HOURS));
        assertThat(buckets.view().counts()).isEmpty();
        assertThat(buckets.view().entryCount()).isZero();
        assertThat(buckets.view().uniqueKeyCount()).isZero();
    }

    @Test
    void rejectsInvalidKeysAndCapacityOverflow() {
        KeywordBuckets buckets = new KeywordBuckets(clock, 168);
        assertThatThrownBy(() -> buckets.record(" PDRN ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> buckets.record("가".repeat(301))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new KeywordBuckets(clock, 168, Integer.MAX_VALUE))
            .isInstanceOf(IllegalArgumentException.class);
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
