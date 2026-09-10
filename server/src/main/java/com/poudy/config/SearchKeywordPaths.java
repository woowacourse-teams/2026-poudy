package com.poudy.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

final class SearchKeywordPaths {
    private SearchKeywordPaths() {
    }

    static Path validate(String configured, boolean prod, String dataDirectory) throws IOException {
        if (prod && (configured == null || configured.isBlank() || !Path.of(configured).isAbsolute())) {
            throw new IllegalArgumentException("Production ranking state requires an explicit absolute path");
        }
        Path path = canonical(
            Path.of(
                configured == null || configured.isBlank()
                    ? "./var/search-ranking/buckets.json" : configured
            )
        );
        Path cwd = canonical(Path.of("."));
        Path resources = canonical(Path.of("src/main/resources"));
        Path nestedResources = canonical(Path.of("server/src/main/resources"));
        if (path.startsWith(resources) || path.startsWith(nestedResources)) {
            throw new IllegalArgumentException("Ranking state cannot be stored in resources");
        }
        if (dataDirectory != null && !dataDirectory.isBlank() && path.startsWith(canonical(Path.of(dataDirectory)))) {
            throw new IllegalArgumentException("Ranking state cannot be stored with catalog data");
        }
        if (prod && (path.startsWith(cwd) || path.startsWith(canonical(Path.of("/opt/poudy/backend")))
            || path.startsWith(canonical(Path.of("/opt/poudy/data"))))) {
            throw new IllegalArgumentException("Ranking state must survive application and catalog replacement");
        }
        return path;
    }

    /** Resolve existing symlinks before processing .., including a not-yet-created leaf. */
    static Path canonical(Path path) throws IOException {
        Path absolute = path.toAbsolutePath();
        Path resolved = absolute.getRoot();
        for (Path part : absolute) {
            if (part.toString().equals(".")) {
                continue;
            }
            if (part.toString().equals("..")) {
                if (resolved.getParent() != null) {
                    resolved = resolved.getParent();
                }
            } else {
                resolved = resolved.resolve(part);
                if (Files.exists(resolved, java.nio.file.LinkOption.NOFOLLOW_LINKS)) {
                    resolved = resolved.toRealPath();
                }
            }
        }
        return resolved;
    }
}
