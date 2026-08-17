package com.poudy.offline.catalogsensory;

import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Path;
import tools.jackson.core.JacksonException;

public final class CatalogSensoryModelDiffMain {

    private static final int FAILURE = 1;

    private CatalogSensoryModelDiffMain() {
    }

    public static void main(String[] arguments) {
        int status = run(arguments, System.err);
        if (status != 0) {
            System.exit(status);
        }
    }

    public static int run(String[] arguments, PrintStream errors) {
        if (arguments.length != 3) {
            errors.println("사용법: <baseline-snapshot.json> <catalog-directory> <report-directory>");
            return FAILURE;
        }

        try {
            CatalogSensoryModelSnapshot baseline = new CatalogSensoryModelSnapshotReader()
                    .read(Path.of(arguments[0]));
            CatalogSensoryModelSnapshot candidate = new CatalogSensoryReadinessAnalyzer()
                    .analyzeModelSnapshot(Path.of(arguments[1]));
            CatalogSensoryModelDiff report = new CatalogSensoryModelDiffAnalyzer()
                    .compare(baseline, candidate);
            new CatalogSensoryModelDiffWriter().write(report, Path.of(arguments[2]));
            return 0;
        } catch (IOException | JacksonException | IllegalArgumentException exception) {
            errors.println("카탈로그 감각 모델 diff를 생성하지 못했습니다: " + exception.getMessage());
            return FAILURE;
        }
    }
}
