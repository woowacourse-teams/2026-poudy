package com.poudy.config;

import java.nio.file.Path;

public final class SearchKeywordPaths {

    private final Path stateFile;

    public SearchKeywordPaths(String stateFile) {
        this.stateFile = normalized(stateFile);
    }

    public Path stateFile() {
        return stateFile;
    }

    public Path reportFile(String configured) {
        Path report = normalized(configured);
        if (report.equals(stateFile)) {
            throw new IllegalArgumentException("Report and snapshot paths must differ");
        }
        return report;
    }

    private static Path normalized(String configured) {
        if (configured == null || configured.isBlank()) {
            throw new IllegalArgumentException("Search keyword file paths must be configured");
        }
        return Path.of(configured).toAbsolutePath().normalize();
    }
}
