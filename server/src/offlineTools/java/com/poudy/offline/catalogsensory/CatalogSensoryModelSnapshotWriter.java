package com.poudy.offline.catalogsensory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public final class CatalogSensoryModelSnapshotWriter {

    public static final String FILE_NAME = "catalog-sensory-model-snapshot.json";

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    public Path write(CatalogSensoryModelSnapshot snapshot, Path outputDirectory)
            throws IOException,
            JacksonException {
        Files.createDirectories(outputDirectory);
        Path target = outputDirectory.resolve(FILE_NAME);
        Path temporary = Files.createTempFile(outputDirectory, "catalog-sensory-model-snapshot-", ".tmp");
        try {
            Files.writeString(temporary, renderJson(snapshot), StandardCharsets.UTF_8);
            moveReplacing(temporary, target);
            return target;
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    public String renderJson(CatalogSensoryModelSnapshot snapshot) throws JacksonException {
        return normalizeNewlines(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(snapshot)) + "\n";
    }

    private static void moveReplacing(Path source, Path target) throws IOException {
        try {
            Files.move(
                    source,
                    target,
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static String normalizeNewlines(String value) {
        return value.replace("\r\n", "\n").replace('\r', '\n');
    }
}
