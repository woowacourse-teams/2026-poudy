package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class SearchKeywordPathsTest {

    @Test
    void requiresAConfiguredStatePath() {
        assertThatThrownBy(() -> new SearchKeywordPaths("")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SearchKeywordPaths(null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsReportAtTheSnapshotPathAfterNormalization() {
        SearchKeywordPaths paths = new SearchKeywordPaths("./var/search-ranking/buckets.json");

        assertThatThrownBy(() -> paths.reportFile("var/search-ranking/../search-ranking/buckets.json"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(paths.reportFile("./var/report.json")).isEqualTo(Path.of("var/report.json").toAbsolutePath());
    }
}
