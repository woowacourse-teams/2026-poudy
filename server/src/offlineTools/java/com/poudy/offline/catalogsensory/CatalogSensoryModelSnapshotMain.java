package com.poudy.offline.catalogsensory;

import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Path;
import tools.jackson.core.JacksonException;

public final class CatalogSensoryModelSnapshotMain {

    private static final int FAILURE = 1;

    private CatalogSensoryModelSnapshotMain() {
    }

    public static void main(String[] arguments) {
        int status = run(arguments, System.err);
        if (status != 0) {
            System.exit(status);
        }
    }

    public static int run(String[] arguments, PrintStream errors) {
        if (arguments.length != 2) {
            errors.println("사용법: <catalog-directory> <snapshot-directory>");
            return FAILURE;
        }

        try {
            CatalogSensoryModelSnapshot snapshot = new CatalogSensoryReadinessAnalyzer()
                    .analyzeModelSnapshot(Path.of(arguments[0]));
            new CatalogSensoryModelSnapshotWriter().write(snapshot, Path.of(arguments[1]));
            return 0;
        } catch (IOException | JacksonException | IllegalArgumentException exception) {
            errors.println("카탈로그 감각 모델 snapshot을 생성하지 못했습니다: " + exception.getMessage());
            return FAILURE;
        }
    }
}
