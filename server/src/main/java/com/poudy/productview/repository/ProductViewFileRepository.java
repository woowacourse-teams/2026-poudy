package com.poudy.productview.repository;

import com.poudy.productview.domain.ProductViewSnapshot;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public class ProductViewFileRepository {

    private final Path file;
    private final JsonMapper mapper = JsonMapper.builder()
        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
        .build();

    public ProductViewFileRepository(Path file) {
        this.file = file.toAbsolutePath().normalize();
    }

    public ProductViewSnapshot load() throws IOException {
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(file);
        } catch (NoSuchFileException exception) {
            return new ProductViewSnapshot(0, Map.of());
        }
        try {
            JsonNode root = mapper.readTree(bytes);
            require(root != null && root.isObject() && root.size() == 2, "루트 형식");
            require(
                root.has("version") && root.get("version").isIntegralNumber()
                    && root.get("version").canConvertToLong() && root.get("version").asLong() == 1,
                "파일 버전"
            );
            JsonNode days = root.get("days");
            require(days != null && days.isObject(), "날짜별 횟수");
            Map<LocalDate, Map<Long, Long>> dailyCounts = new HashMap<>();
            for (Map.Entry<String, JsonNode> day : days.properties()) {
                LocalDate date = LocalDate.parse(day.getKey());
                require(date.toString().equals(day.getKey()), "날짜 표기");
                dailyCounts.put(date, countsOf(day.getValue()));
            }
            return new ProductViewSnapshot(0, dailyCounts);
        } catch (RuntimeException exception) {
            throw new IOException("제품 조회수 파일을 복원할 수 없습니다: " + file, exception);
        }
    }

    private Map<Long, Long> countsOf(JsonNode node) {
        require(node.isObject(), "제품별 횟수");
        Map<Long, Long> counts = new HashMap<>();
        for (Map.Entry<String, JsonNode> entry : node.properties()) {
            long id = Long.parseLong(entry.getKey());
            require(Long.toString(id).equals(entry.getKey()), "제품 ID 표기");
            JsonNode count = entry.getValue();
            require(count.isIntegralNumber() && count.canConvertToLong() && count.asLong() > 0, "조회 횟수");
            counts.put(id, count.asLong());
        }
        return counts;
    }

    private static void require(boolean valid, String field) {
        if (!valid) {
            throw new IllegalArgumentException("잘못된 제품 조회수 파일: " + field);
        }
    }

    public void save(ProductViewSnapshot snapshot) throws IOException {
        byte[] bytes = mapper.writeValueAsBytes(Map.of("version", 1, "days", snapshot.dailyCounts()));
        Files.createDirectories(file.getParent());
        Path temporary = Files.createTempFile(file.getParent(), ".product-views-", ".tmp");
        try {
            try (FileChannel channel = FileChannel.open(temporary, Set.of(StandardOpenOption.WRITE))) {
                ByteBuffer buffer = ByteBuffer.wrap(bytes);
                while (buffer.hasRemaining()) {
                    channel.write(buffer);
                }
                channel.force(true);
            }
            Files.move(temporary, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }
}
