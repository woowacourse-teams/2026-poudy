package com.poudy.searchkeyword.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.KeywordBucket;
import com.poudy.searchkeyword.domain.KeywordBucketSnapshot;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Owns the strict mutable snapshot format; never reads or writes the keyword dictionary. */
public class KeywordSnapshotRepository {

    private static final JsonMapper MAPPER = JsonMapper.builder()
        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
        .build();
    // 한 번도 배포되지 않은 상태에서 정한 첫 형식이다. 과거 형식을 읽는 호환 규칙은 두지 않는다.
    private static final int SCHEMA_VERSION = 1;

    private final Path file;
    private final int windowHours;
    private final int bucketSeconds;

    public KeywordSnapshotRepository(Path file, int windowHours) {
        this(file, windowHours, SearchKeywordPolicy.BUCKET_SECONDS);
    }

    public KeywordSnapshotRepository(Path file, int windowHours, int bucketSeconds) {
        if (windowHours < 1) {
            throw new IllegalArgumentException("Window must be positive");
        }
        this.file = file.toAbsolutePath().normalize();
        this.windowHours = windowHours;
        if (bucketSeconds < 1 || 3600 % bucketSeconds != 0) {
            throw new IllegalArgumentException("Bucket duration must divide one hour");
        }
        this.bucketSeconds = bucketSeconds;
    }

    public Optional<KeywordBucketSnapshot> load() {
        try {
            KeywordBucketSnapshot snapshot;
            try (InputStream input = Files.newInputStream(file)) {
                snapshot = decode(MAPPER.readTree(input));
            } catch (NoSuchFileException missing) {
                if (Files.exists(file, java.nio.file.LinkOption.NOFOLLOW_LINKS)) {
                    throw missing;
                }
                removeTemporaryFiles();
                return Optional.empty();
            }
            validate(snapshot);
            removeTemporaryFiles();
            return Optional.of(snapshot);
        } catch (IOException | RuntimeException failure) {
            throw new InfrastructureException("검색어 집계 파일을 복원하지 못했습니다", failure);
        }
    }

    public void save(KeywordBucketSnapshot snapshot) {
        Path temporary = null;
        try {
            Files.createDirectories(file.getParent());
            temporary = Files.createTempFile(file.getParent(), temporaryPrefix(), ".json");
            try (OutputStream output = Files.newOutputStream(temporary);
                JsonGenerator json = MAPPER.createGenerator(output)) {
                encode(json, snapshot);
            }
            forceFile(temporary);
            replace(temporary, file);
            syncDirectory(file.getParent());
        } catch (IOException | RuntimeException failure) {
            throw new InfrastructureException("검색어 집계 스냅샷을 저장하지 못했습니다", failure);
        } finally {
            if (temporary != null) {
                try {
                    Files.deleteIfExists(temporary);
                } catch (IOException ignored) {
                    // A later successful startup cleans leftovers after validating the target file.
                }
            }
        }
    }

    protected void forceFile(Path temporary) throws IOException {
        try (FileChannel channel = FileChannel.open(temporary, StandardOpenOption.WRITE)) {
            channel.force(true);
        }
    }

    protected void replace(Path temporary, Path target) throws IOException {
        Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    }

    protected void syncDirectory(Path directory) throws IOException {
        try (FileChannel channel = FileChannel.open(directory, StandardOpenOption.READ)) {
            channel.force(true);
        }
    }

    private void removeTemporaryFiles() throws IOException {
        if (!Files.exists(file.getParent())) {
            return;
        }
        try (Stream<Path> files = Files.list(file.getParent())) {
            for (Path leftover : files.filter(path -> path.getFileName().toString().startsWith(temporaryPrefix()))
                .toList()) {
                Files.delete(leftover);
            }
        }
    }

    private String temporaryPrefix() {
        return file.getFileName() + ".tmp-";
    }

    private void validate(KeywordBucketSnapshot snapshot) {
        // 키 검증은 복원이 소유한다. 여기서 한 번 더 훑으면 같은 규칙이 두 곳에서 갈라진다.
        KeywordBuckets validator = new KeywordBuckets(
            Clock.fixed(snapshot.maxObservedBucketStart(), ZoneOffset.UTC),
            windowHours,
            bucketSeconds
        );
        validator.restore(snapshot);
        validator.view();
    }

    private KeywordBucketSnapshot decode(JsonNode root) {
        requireFields(root, Set.of("schemaVersion", "savedAt", "bucketSeconds", "maxObservedBucketStart", "buckets"));
        if (integer(root.get("schemaVersion")) != SCHEMA_VERSION
            || integer(root.get("bucketSeconds")) != bucketSeconds) {
            throw new IllegalArgumentException(
                "Unsupported snapshot format: expected schemaVersion=" + SCHEMA_VERSION + ",bucketSeconds="
                    + bucketSeconds
            );
        }
        JsonNode bucketNodes = root.get("buckets");
        if (!bucketNodes.isArray()) {
            throw new IllegalArgumentException("Invalid snapshot buckets");
        }
        List<KeywordBucket> buckets = new ArrayList<>();
        for (JsonNode bucket : bucketNodes) {
            requireFields(bucket, Set.of("start", "counts"));
            JsonNode countNodes = bucket.get("counts");
            if (!countNodes.isObject()) {
                throw new IllegalArgumentException("Invalid snapshot counts");
            }
            Map<String, Long> counts = new HashMap<>();
            for (Map.Entry<String, JsonNode> entry : countNodes.properties()) {
                counts.put(entry.getKey(), integer(entry.getValue()));
            }
            buckets.add(new KeywordBucket(timestamp(bucket.get("start")), counts));
        }
        return new KeywordBucketSnapshot(
            timestamp(root.get("savedAt")),
            timestamp(root.get("maxObservedBucketStart")),
            buckets
        );
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

    private void encode(JsonGenerator json, KeywordBucketSnapshot snapshot) {
        json.writeStartObject();
        json.writeNumberProperty("schemaVersion", SCHEMA_VERSION);
        json.writeStringProperty("savedAt", snapshot.savedAt().toString());
        json.writeNumberProperty("bucketSeconds", bucketSeconds);
        json.writeStringProperty("maxObservedBucketStart", snapshot.maxObservedBucketStart().toString());
        json.writeArrayPropertyStart("buckets");
        for (KeywordBucket bucket : snapshot.buckets()) {
            json.writeStartObject();
            json.writeStringProperty("start", bucket.start().toString());
            json.writeObjectPropertyStart("counts");
            for (Map.Entry<String, Long> entry : bucket.counts().entrySet()) {
                json.writeNumberProperty(entry.getKey(), entry.getValue());
            }
            json.writeEndObject();
            json.writeEndObject();
        }
        json.writeEndArray();
        json.writeEndObject();
    }
}
