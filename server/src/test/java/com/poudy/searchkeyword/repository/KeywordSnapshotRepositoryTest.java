package com.poudy.searchkeyword.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.BucketWindow;
import com.poudy.searchkeyword.domain.KeywordBucket;
import com.poudy.searchkeyword.domain.KeywordBucketSnapshot;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class KeywordSnapshotRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-09-06T10:30:00Z");
    private static final String VALID = """
        {"schemaVersion":1,"savedAt":"2026-09-06T10:30:00Z",
         "bucketSeconds":600,"maxObservedBucketStart":"2026-09-06T10:30:00Z",
         "buckets":[{"start":"2026-09-06T10:30:00Z","counts":{"토너":2}}]}
        """;

    @TempDir
    private Path directory;

    @Test
    void missingFileAloneStartsEmptyAndRoundtripPreservesNormalizedCounts() {
        KeywordSnapshotRepository repository = repository();
        KeywordBuckets empty = buckets();
        repository.restoreInto(empty);
        assertThat(empty.snapshot().buckets()).isEmpty();
        KeywordBuckets original = buckets();
        original.record("토너");
        original.record("pdrn");
        original.record("토너");
        KeywordBucketSnapshot snapshot = original.snapshot();
        repository.save(snapshot);
        KeywordBuckets restored = buckets();
        repository.restoreInto(restored);
        assertThat(restored.snapshot()).isEqualTo(snapshot);
    }

    @ParameterizedTest
    @CsvSource({"30,60", "60,30", "180,60", "600,60"})
    void roundtripPreservesConfiguredBucketResolution(int bucketSeconds, int otherSeconds) {
        KeywordSnapshotRepository repository = repository();
        Clock clock = Clock.fixed(Instant.parse("2026-09-06T10:00:00Z"), ZoneOffset.UTC);
        KeywordBuckets original = new KeywordBuckets(clock, new BucketWindow(168, bucketSeconds, 0));
        original.record("토너");
        KeywordBucketSnapshot snapshot = original.snapshot();
        repository.save(snapshot);
        KeywordBuckets restored = new KeywordBuckets(clock, new BucketWindow(168, bucketSeconds, 0));
        repository.restoreInto(restored);
        assertThat(restored.snapshot()).isEqualTo(snapshot);
        KeywordBuckets mismatched = new KeywordBuckets(clock, new BucketWindow(168, otherSeconds, 0));
        assertThatThrownBy(() -> repository.restoreInto(mismatched)).isInstanceOf(InfrastructureException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "schema",
            "missing",
            "unknown",
            "duplicateField",
            "duplicateCount",
            "duplicateBucket",
            "fractionalCount",
            "zeroCount",
            "negativeCount",
            "overflowCount",
            "unnormalized",
            "emptyKey",
            "longKey",
            "unusable-key",
            "formatCharacter",
            "future",
            "fractionalHour",
            "futureMaximum",
            "fractionalMaximum",
            "trailing",
            "null"
    })
    void rejectsCorruptSnapshotsWithoutChangingTheOriginalOrAdoptingTemporaryFiles(String corruption)
        throws IOException {
        String invalid = corrupt(corruption);
        Files.writeString(file(), invalid);
        Path leftover = directory.resolve("buckets.json.tmp-orphan.json");
        Files.writeString(leftover, VALID);
        assertThatThrownBy(() -> repository().restoreInto(buckets())).isInstanceOf(InfrastructureException.class);
        assertThat(Files.readString(file())).isEqualTo(invalid);
        assertThat(leftover).exists();
    }

    @Test
    void rejectsDuplicateOrMalformedSnapshotInsteadOfPartiallyRestoring() throws IOException {
        String twoKeys = VALID.replace("\"토너\":2", "\"토너\":2,\"크림\":3");
        Files.writeString(file(), twoKeys);
        KeywordBuckets restored = buckets();
        repository().restoreInto(restored);
        assertThat(restored.snapshot().buckets().getFirst().counts()).containsEntry("크림", 3L);
        assertThat(Files.readString(file())).isEqualTo(twoKeys);
    }

    @Test
    void cleansOrphanOnlyAfterValidatingTarget() throws IOException {
        Files.writeString(file(), VALID);
        Path orphan = directory.resolve("buckets.json.tmp-orphan.json");
        Files.writeString(orphan, "invalid");
        repository().restoreInto(buckets());
        assertThat(orphan).doesNotExist();
    }

    @Test
    void everyMaxLengthEscapingSampleFitsTheConservativePerEntryBudget() throws IOException {
        String maximum = "\"\\".repeat(150);
        KeywordBucketSnapshot sample = new KeywordBucketSnapshot(
            NOW,
            600,
            NOW.truncatedTo(ChronoUnit.HOURS),
            List.of(new KeywordBucket(NOW.truncatedTo(ChronoUnit.HOURS), Map.of(maximum, Long.MAX_VALUE)))
        );
        repository().save(sample);
        assertThat(Files.size(file())).isLessThan(2048L + 1024L);
        KeywordBuckets restored = buckets();
        repository().restoreInto(restored);
        assertThat(restored.snapshot().buckets()).isEqualTo(sample.buckets());
    }

    private String corrupt(String corruption) {
        return switch (corruption) {
            case "schema" -> VALID.replace("\"schemaVersion\":1", "\"schemaVersion\":2");
            case "missing" -> VALID.replace("\"bucketSeconds\":600,", "");
            case "unknown" -> VALID.replace("\"bucketSeconds\":600", "\"bucketSeconds\":600,\"unknown\":1");
            case "duplicateField" ->
                VALID.replace("\"bucketSeconds\":600", "\"bucketSeconds\":600,\"bucketSeconds\":600");
            case "duplicateCount" -> VALID.replace("\"토너\":2", "\"토너\":2,\"토너\":3");
            case "duplicateBucket" -> VALID.replace(
                "\"counts\":{\"토너\":2}}]",
                "\"counts\":{\"토너\":2}},"
                    + "{\"start\":\"2026-09-06T10:30:00Z\",\"counts\":{\"토너\":2}}]"
            );
            case "fractionalCount" -> VALID.replace("\"토너\":2", "\"토너\":2.0");
            case "zeroCount" -> VALID.replace("\"토너\":2", "\"토너\":0");
            case "negativeCount" -> VALID.replace("\"토너\":2", "\"토너\":-1");
            case "overflowCount" -> VALID.replace("\"토너\":2", "\"토너\":9223372036854775808");
            case "unnormalized" -> VALID.replace("토너", " 토 너 ");
            case "emptyKey" -> VALID.replace("토너", "");
            case "longKey" -> VALID.replace("토너", "가".repeat(301));
            case "unusable-key" -> VALID.replace("토너", "");
            case "formatCharacter" -> VALID.replace("토너", "토\\u200b너");
            case "future" -> VALID.replace("\"start\":\"2026-09-06T10:30:00Z\"", "\"start\":\"2026-09-06T10:40:00Z\"");
            case "fractionalHour" ->
                VALID.replace("\"start\":\"2026-09-06T10:30:00Z\"", "\"start\":\"2026-09-06T10:30:01Z\"");
            case "futureMaximum" -> VALID.replace(
                "\"maxObservedBucketStart\":\"2026-09-06T10:30:00Z\"",
                "\"maxObservedBucketStart\":\"2026-09-06T10:40:00Z\""
            );
            case "fractionalMaximum" -> VALID.replace(
                "\"maxObservedBucketStart\":\"2026-09-06T10:30:00Z\"",
                "\"maxObservedBucketStart\":\"2026-09-06T10:30:01Z\""
            );
            case "trailing" -> VALID + "{}";
            case "null" -> "null";
            default -> throw new IllegalArgumentException(corruption);
        };
    }

    private Path file() {
        return directory.resolve("buckets.json");
    }

    private KeywordSnapshotRepository repository() {
        return new KeywordSnapshotRepository(file());
    }

    private static KeywordBuckets buckets() {
        return new KeywordBuckets(Clock.fixed(NOW, ZoneOffset.UTC), new BucketWindow(168, 600, 0));
    }
}
