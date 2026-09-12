package com.poudy.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.List;

public final class SearchKeywordPaths {

    private static final String PROD_STATE_FILE = "/opt/poudy/state/search-ranking/buckets.json";
    private static final String LOCAL_STATE_FILE = "./var/search-ranking/buckets.json";

    private final boolean prod;
    private final String dataDirectory;

    public SearchKeywordPaths(boolean prod, String dataDirectory) {
        this.prod = prod;
        this.dataDirectory = dataDirectory;
    }

    public Path stateFile() throws IOException {
        if (prod) {
            return validate(PROD_STATE_FILE);
        }
        return validate(LOCAL_STATE_FILE);
    }

    public Path reportFile(String configured) throws IOException {
        Path report = validate(configured);
        if (report.equals(stateFile())) {
            throw new IllegalArgumentException("Report and snapshot paths must differ");
        }
        return report;
    }

    private Path validate(String configured) throws IOException {
        requireExplicitPath(configured);
        Path path = canonical(Path.of(configured));
        rejectInside(path, resourceDirectories(), "Ranking state cannot be stored in resources");
        rejectInside(path, catalogDirectories(), "Ranking state cannot be stored with catalog data");
        rejectInside(path, replaceableDirectories(), "Ranking state must survive application and catalog replacement");
        return path;
    }

    private static Path canonical(Path path) throws IOException {
        Path absolute = path.toAbsolutePath();
        Path resolved = absolute.getRoot();
        for (Path part : absolute) {
            resolved = follow(resolved, part.toString());
        }
        return resolved;
    }

    private void requireExplicitPath(String configured) {
        if (configured == null || configured.isBlank()) {
            throw new IllegalArgumentException("Ranking state requires an explicit path");
        }
        if (prod && !Path.of(configured).isAbsolute()) {
            throw new IllegalArgumentException("Production ranking state requires an explicit absolute path");
        }
    }

    private List<Path> catalogDirectories() throws IOException {
        if (dataDirectory == null || dataDirectory.isBlank()) {
            return List.of();
        }
        return List.of(canonical(Path.of(dataDirectory)));
    }

    private List<Path> replaceableDirectories() throws IOException {
        if (!prod) {
            return List.of();
        }
        return List.of(
            canonical(Path.of(".")),
            canonical(Path.of("/opt/poudy/backend")),
            canonical(Path.of("/opt/poudy/data"))
        );
    }

    private static List<Path> resourceDirectories() throws IOException {
        return List.of(canonical(Path.of("src/main/resources")), canonical(Path.of("server/src/main/resources")));
    }

    private static void rejectInside(Path path, List<Path> directories, String message) {
        if (directories.stream().anyMatch(path::startsWith)) {
            throw new IllegalArgumentException(message);
        }
    }

    private static Path follow(Path resolved, String part) throws IOException {
        if (part.equals(".")) {
            return resolved;
        }
        if (part.equals("..")) {
            return parentOf(resolved);
        }
        Path next = resolved.resolve(part);
        if (Files.exists(next, LinkOption.NOFOLLOW_LINKS)) {
            return next.toRealPath();
        }
        return next;
    }

    private static Path parentOf(Path path) {
        if (path.getParent() == null) {
            return path;
        }
        return path.getParent();
    }
}
