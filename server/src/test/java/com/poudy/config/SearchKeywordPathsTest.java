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
        assertThatThrownBy(() -> SearchKeywordPaths.validate("", true, ""))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SearchKeywordPaths.validate("relative.json", true, ""))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SearchKeywordPaths.validate("src/main/resources/state.json", false, ""))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> SearchKeywordPaths
                .validate(temp.resolve("data/a.json").toString(), false, temp.resolve("data").toString())
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void resolvesExistingSymlinksBeforeDotDot() throws Exception {
        Path catalog = Files.createDirectories(temp.resolve("catalog"));
        Path child = Files.createDirectories(catalog.resolve("child"));
        Files.createSymbolicLink(temp.resolve("alias"), child);
        assertThatThrownBy(
            () -> SearchKeywordPaths.validate(temp.resolve("alias/../state.json").toString(), false, catalog.toString())
        ).isInstanceOf(IllegalArgumentException.class);
        assertThat(SearchKeywordPaths.validate(temp.resolve("state/buckets.json").toString(), true, catalog.toString()))
            .isEqualTo(temp.toRealPath().resolve("state/buckets.json"));
    }
}
