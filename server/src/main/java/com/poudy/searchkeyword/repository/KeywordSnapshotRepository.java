package com.poudy.searchkeyword.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.BucketWindow;
import com.poudy.searchkeyword.domain.KeywordBucket;
import com.poudy.searchkeyword.domain.KeywordBucketSnapshot;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public final class KeywordSnapshotRepository {

    private final Path file;
    private final BucketWindow window;

    public KeywordSnapshotRepository(Path file, int windowHours) {
        this(file, windowHours, SearchKeywordPolicy.BUCKET_SECONDS);
    }

    public KeywordSnapshotRepository(Path file, int windowHours, int bucketSeconds) {
        this.file = file.toAbsolutePath().normalize();
        this.window = new BucketWindow(windowHours, bucketSeconds);
    }

    public Optional<KeywordBucketSnapshot> load() {
        try {
            Optional<KeywordBucketSnapshot> snapshot = read();
            snapshot.ifPresent(found -> found.validateWithin(window));
            removeTemporaryFiles();
            return snapshot;
        } catch (IOException | RuntimeException failure) {
            throw new InfrastructureException("검색어 집계 파일을 복원하지 못했습니다", failure);
        }
    }

    public void save(KeywordBucketSnapshot snapshot) {
        Path temporary = null;
        try {
            Files.createDirectories(file.getParent());
            temporary = Files.createTempFile(file.getParent(), temporaryPrefix(), ".json");
            write(temporary, snapshot);
            forceFile(temporary);
            replace(temporary, file);
            syncDirectory(file.getParent());
        } catch (IOException | RuntimeException failure) {
            throw new InfrastructureException("검색어 집계 스냅샷을 저장하지 못했습니다", failure);
        } finally {
            deleteQuietly(temporary);
        }
    }

    private void forceFile(Path temporary) throws IOException {
        try (FileChannel channel = FileChannel.open(temporary, StandardOpenOption.WRITE)) {
            channel.force(true);
        }
    }

    private void replace(Path temporary, Path target) throws IOException {
        Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    }

    private void syncDirectory(Path directory) throws IOException {
        try (FileChannel channel = FileChannel.open(directory, StandardOpenOption.READ)) {
            channel.force(true);
        }
    }

    private Optional<KeywordBucketSnapshot> read() throws IOException {
        try (InputStream input = Files.newInputStream(file)) {
            return Optional.of(SnapshotJson.decode(input, window.bucketSeconds()));
        } catch (NoSuchFileException missing) {
            return absentUnlessLinked(missing);
        }
    }

    private Optional<KeywordBucketSnapshot> absentUnlessLinked(NoSuchFileException missing)
        throws NoSuchFileException {
        if (Files.exists(file, LinkOption.NOFOLLOW_LINKS)) {
            throw missing;
        }
        return Optional.empty();
    }

    private void write(Path temporary, KeywordBucketSnapshot snapshot) throws IOException {
        try (OutputStream output = Files.newOutputStream(temporary)) {
            SnapshotJson.encode(output, snapshot, window.bucketSeconds());
        }
    }

    private void removeTemporaryFiles() throws IOException {
        if (!Files.exists(file.getParent())) {
            return;
        }
        for (Path leftover : temporaryFiles()) {
            Files.delete(leftover);
        }
    }

    private List<Path> temporaryFiles() throws IOException {
        try (Stream<Path> files = Files.list(file.getParent())) {
            return files.filter(path -> path.getFileName().toString().startsWith(temporaryPrefix())).toList();
        }
    }

    private String temporaryPrefix() {
        return file.getFileName() + ".tmp-";
    }

    private static void deleteQuietly(Path temporary) {
        if (temporary == null) {
            return;
        }
        try {
            Files.deleteIfExists(temporary);
        } catch (IOException ignored) {
            return;
        }
    }

    private static final class SnapshotJson {

        private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();
        private static final int SCHEMA_VERSION = 1;
        private static final Set<String> SNAPSHOT_FIELDS = Set.of(
            "schemaVersion",
            "savedAt",
            "bucketSeconds",
            "maxObservedBucketStart",
            "buckets"
        );
        private static final Set<String> BUCKET_FIELDS = Set.of("start", "counts");

        private static KeywordBucketSnapshot decode(InputStream input, int bucketSeconds) {
            JsonNode root = MAPPER.readTree(input);
            requireFields(root, SNAPSHOT_FIELDS);
            requireFormat(root, bucketSeconds);
            return new KeywordBucketSnapshot(
                timestamp(root.get("savedAt")),
                timestamp(root.get("maxObservedBucketStart")),
                buckets(root.get("buckets"))
            );
        }

        private static void encode(OutputStream output, KeywordBucketSnapshot snapshot, int bucketSeconds) {
            try (JsonGenerator json = MAPPER.createGenerator(output)) {
                json.writeStartObject();
                json.writeNumberProperty("schemaVersion", SCHEMA_VERSION);
                json.writeStringProperty("savedAt", snapshot.savedAt().toString());
                json.writeNumberProperty("bucketSeconds", bucketSeconds);
                json.writeStringProperty("maxObservedBucketStart", snapshot.maxObservedBucketStart().toString());
                json.writeArrayPropertyStart("buckets");
                snapshot.buckets().forEach(bucket -> writeBucket(json, bucket));
                json.writeEndArray();
                json.writeEndObject();
            }
        }

        private static void writeBucket(JsonGenerator json, KeywordBucket bucket) {
            json.writeStartObject();
            json.writeStringProperty("start", bucket.start().toString());
            json.writeObjectPropertyStart("counts");
            bucket.counts().forEach((key, count) -> json.writeNumberProperty(key, count.longValue()));
            json.writeEndObject();
            json.writeEndObject();
        }

        private static void requireFormat(JsonNode root, int bucketSeconds) {
            if (integer(root.get("schemaVersion")) != SCHEMA_VERSION
                || integer(root.get("bucketSeconds")) != bucketSeconds) {
                throw new IllegalArgumentException(
                    "Unsupported snapshot format: expected schemaVersion=" + SCHEMA_VERSION + ",bucketSeconds="
                        + bucketSeconds
                );
            }
        }

        private static List<KeywordBucket> buckets(JsonNode nodes) {
            if (!nodes.isArray()) {
                throw new IllegalArgumentException("Invalid snapshot buckets");
            }
            return StreamSupport.stream(nodes.spliterator(), false).map(SnapshotJson::bucket).toList();
        }

        private static KeywordBucket bucket(JsonNode node) {
            requireFields(node, BUCKET_FIELDS);
            return new KeywordBucket(timestamp(node.get("start")), counts(node.get("counts")));
        }

        private static Map<String, Long> counts(JsonNode node) {
            if (!node.isObject()) {
                throw new IllegalArgumentException("Invalid snapshot counts");
            }
            Map<String, Long> counts = new HashMap<>();
            node.properties().forEach(entry -> counts.put(entry.getKey(), integer(entry.getValue())));
            return counts;
        }

        private static void requireFields(JsonNode object, Set<String> fields) {
            if (object == null || !object.isObject() || object.size() != fields.size()
                || !fields.stream().allMatch(object::has)) {
                throw new IllegalArgumentException("Invalid snapshot fields");
            }
        }

        private static long integer(JsonNode node) {
            if (node == null || !node.isIntegralNumber() || !node.canConvertToLong()) {
                throw new IllegalArgumentException("Invalid snapshot integer");
            }
            return node.longValue();
        }

        private static Instant timestamp(JsonNode node) {
            if (node == null || !node.isString()) {
                throw new IllegalArgumentException("Invalid snapshot timestamp");
            }
            return Instant.parse(node.stringValue());
        }
    }
}
