package com.poudy.offline.catalogsensory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public final class CatalogSensoryModelSnapshotReader {

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    public CatalogSensoryModelSnapshot read(Path snapshotFile) throws IOException, JacksonException {
        if (!Files.isRegularFile(snapshotFile)) {
            throw new IOException("감각 모델 snapshot 파일이 없습니다: " + snapshotFile.getFileName());
        }
        return MAPPER.readValue(Files.readAllBytes(snapshotFile), CatalogSensoryModelSnapshot.class);
    }
}
