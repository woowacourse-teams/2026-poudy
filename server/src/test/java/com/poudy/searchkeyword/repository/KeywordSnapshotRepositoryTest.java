package com.poudy.searchkeyword.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InfrastructureException;
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
        assertThat(repository.load()).isEmpty();
        KeywordBuckets original = new KeywordBuckets(Clock.fixed(NOW, ZoneOffset.UTC), 168);
        original.record("토너");
        original.record("pdrn");
        original.record("토너");
        KeywordBucketSnapshot snapshot = original.snapshot();
        repository.save(snapshot);
        assertThat(repository.load()).contains(snapshot);
    }

    @ParameterizedTest
    @CsvSource({"30", "60", "180", "600"})
    void roundtripPreservesConfiguredBucketResolution(int bucketSeconds) {
        KeywordSnapshotRepository configured = new KeywordSnapshotRepository(
            file(),
            168,
            bucketSeconds
        );
        Instant start = Instant.parse("2026-09-06T10:00:00Z");
        KeywordBuckets buckets = new KeywordBuckets(Clock.fixed(start, ZoneOffset.UTC), 168, bucketSeconds);
        buckets.record("토너");
        KeywordBucketSnapshot snapshot = buckets.snapshot();
        configured.save(snapshot);
        assertThat(configured.load()).contains(snapshot);
        KeywordSnapshotRepository mismatched = new KeywordSnapshotRepository(
            file(),
            168,
            bucketSeconds == 60 ? 30 : 60
        );
        assertThatThrownBy(mismatched::load).isInstanceOf(InfrastructureException.class);
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
        assertThatThrownBy(() -> repository().load()).isInstanceOf(InfrastructureException.class);
        assertThat(Files.readString(file())).isEqualTo(invalid);
        assertThat(leftover).exists();
    }

    @Test
    void rejectsDuplicateOrMalformedSnapshotInsteadOfPartiallyRestoring() throws IOException {
        String twoKeys = VALID.replace("\"토너\":2", "\"토너\":2,\"크림\":3");
        Files.writeString(file(), twoKeys);
        assertThat(repository().load()).isPresent();
        assertThat(Files.readString(file())).isEqualTo(twoKeys);
    }

    @Test
    void cleansOrphanOnlyAfterValidatingTarget() throws IOException {
        Files.writeString(file(), VALID);
        Path orphan = directory.resolve("buckets.json.tmp-orphan.json");
        Files.writeString(orphan, "invalid");
        assertThat(repository().load()).isPresent();
        assertThat(orphan).doesNotExist();
    }

    @ParameterizedTest
    @ValueSource(strings = {"force", "replace"})
    void failuresBeforeReplacementPreserveOriginal(String stage) throws IOException {
        Files.writeString(file(), VALID);
        KeywordSnapshotRepository failing = new KeywordSnapshotRepository(
            file(),
            168
        ) {
            @Override
            protected void forceFile(Path temporary) throws IOException {
                if (stage.equals("force")) {
                    throw new IOException("injected force failure");
                }
                super.forceFile(temporary);
            }

            @Override
            protected void replace(Path temporary, Path target) throws IOException {
                throw new IOException("injected replace failure");
            }
        };
        assertThatThrownBy(() -> failing.save(snapshot())).isInstanceOf(InfrastructureException.class);
        assertThat(Files.readString(file())).isEqualTo(VALID);
    }

    @Test
    void everyMaxLengthEscapingSampleFitsTheConservativePerEntryBudget() throws IOException {
        String maximum = "\"\\".repeat(150);
        KeywordBucketSnapshot sample = new KeywordBucketSnapshot(
            NOW,
            NOW.truncatedTo(ChronoUnit.HOURS),
            List.of(new KeywordBucket(NOW.truncatedTo(ChronoUnit.HOURS), Map.of(maximum, Long.MAX_VALUE)))
        );
        repository().save(sample);
        assertThat(Files.size(file())).isLessThan(2048L + 1024L);
        assertThat(repository().load()).contains(sample);
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

    private KeywordBucketSnapshot snapshot() {
        return new KeywordBucketSnapshot(
            NOW,
            NOW.truncatedTo(ChronoUnit.HOURS),
            List.of(new KeywordBucket(NOW.truncatedTo(ChronoUnit.HOURS), Map.of("크림", 4L)))
        );
    }

    private Path file() {
        return directory.resolve("buckets.json");
    }

    private KeywordSnapshotRepository repository() {
        return new KeywordSnapshotRepository(file(), 168);
    }
}
