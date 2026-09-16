package com.poudy.productview.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIOException;

import com.poudy.productview.domain.ProductViews;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ProductViewFileRepositoryTest {

    @TempDir
    Path directory;

    @Test
    void startsEmptyAndRestoresReplacedSnapshotIncludingOldProducts() throws Exception {
        Path file = directory.resolve("state/views.json");
        ProductViewFileRepository repository = new ProductViewFileRepository(file);
        assertThat(repository.load().dailyCounts()).isEmpty();
        assertThat(Files.exists(file)).isFalse();
        repository.save(ProductViews.from(Map.of(LocalDate.of(2020, 1, 1), Map.of(999L, 1L))));
        Map<LocalDate, Map<Long, Long>> counts = Map.of(
            LocalDate.of(2020, 1, 1),
            Map.of(999L, 1L),
            LocalDate.of(2026, 9, 12),
            Map.of(1L, 3L)
        );
        repository.save(ProductViews.from(counts));

        assertThat(new ProductViewFileRepository(file).load().dailyCounts()).isEqualTo(counts);
        try (var files = Files.list(file.getParent())) {
            assertThat(files.toList()).containsExactly(file);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "null",
            "{}",
            "{",
            "[]",
            "{\"version\":2,\"days\":{}}",
            "{\"version\":1,\"days\":null}",
            "{\"version\":1,\"days\":{\"2026-02-30\":{\"1\":1}}}",
            "{\"version\":1,\"days\":{\"2026-09-12\":{\"1\":-1}}}",
            "{\"version\":1,\"days\":{\"2026-09-12\":{\"1\":0}}}",
            "{\"version\":1,\"days\":{\"2026-09-12\":{\"1\":1.5}}}",
            "{\"version\":1,\"days\":{\"2026-09-12\":{\"1\":\"2\"}}}",
            "{\"version\":1,\"days\":{\"2026-09-12\":{\"1\":9223372036854775808}}}",
            "{\"version\":1,\"days\":{\"2026-09-12\":{\"1\":1,\"1\":2}}}",
            "{\"version\":1,\"days\":{}} {}"
    })
    void corruptFilesFailWithoutChangingOriginal(String content) throws Exception {
        Path file = directory.resolve("views.json");
        Files.writeString(file, content);
        assertThatIOException().isThrownBy(() -> new ProductViewFileRepository(file).load());
        assertThat(Files.readString(file)).isEqualTo(content);
    }

    @Test
    void failedReplacementPreservesTargetAndCleansTemporaryFile() throws Exception {
        Path file = Files.createDirectory(directory.resolve("views.json"));
        Files.writeString(file.resolve("existing"), "preserve");
        ProductViewFileRepository repository = new ProductViewFileRepository(file);
        assertThatIOException().isThrownBy(() -> repository.save(ProductViews.from(Map.of())));
        assertThat(Files.readString(file.resolve("existing"))).isEqualTo("preserve");
        try (var files = Files.list(directory)) {
            assertThat(files.toList()).containsExactly(file);
        }
        assertThatIOException().isThrownBy(repository::load);
    }
}
