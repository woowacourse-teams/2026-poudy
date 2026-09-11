package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SearchKeywordPathsTest {
    @TempDir
    Path temp;

    @Test
    void requiresExplicitProductionPathAndRejectsCatalogAndResources() {
        assertThatThrownBy(() -> new SearchKeywordPaths(true, "").reportFile(""))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SearchKeywordPaths(true, "").reportFile("relative.json"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SearchKeywordPaths(false, "").reportFile("src/main/resources/state.json"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> new SearchKeywordPaths(false, temp.resolve("data").toString())
                .reportFile(temp.resolve("data/a.json").toString())
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void resolvesExistingSymlinksBeforeDotDot() throws Exception {
        Path catalog = Files.createDirectories(temp.resolve("catalog"));
        Path child = Files.createDirectories(catalog.resolve("child"));
        Files.createSymbolicLink(temp.resolve("alias"), child);
        assertThatThrownBy(
            () -> new SearchKeywordPaths(false, catalog.toString())
                .reportFile(temp.resolve("alias/../state.json").toString())
        ).isInstanceOf(IllegalArgumentException.class);
        assertThat(
            new SearchKeywordPaths(true, catalog.toString()).reportFile(temp.resolve("state/buckets.json").toString())
        )
            .isEqualTo(temp.toRealPath().resolve("state/buckets.json"));
    }

    @Test
    void rejectsReportAtTheSnapshotPath() {
        SearchKeywordPaths paths = new SearchKeywordPaths(false, "");
        assertThatThrownBy(() -> paths.reportFile("./var/search-ranking/buckets.json"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
