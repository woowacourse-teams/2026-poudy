package com.poudy.offline.catalogsensory;

import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Path;
import tools.jackson.core.JacksonException;

public final class CatalogSensoryReadinessMain {

    private static final int FAILURE = 1;

    private CatalogSensoryReadinessMain() {
    }

    public static void main(String[] arguments) {
        int status = run(arguments, System.err);
        if (status != 0) {
            System.exit(status);
        }
    }

    public static int run(String[] arguments, PrintStream errors) {
        if (arguments.length != 2) {
            errors.println("사용법: <catalog-directory> <report-directory>");
            return FAILURE;
        }

        Path catalogDirectory = Path.of(arguments[0]);
        Path reportDirectory = Path.of(arguments[1]);
        try {
            CatalogSensoryReadinessReport report = new CatalogSensoryReadinessAnalyzer().analyze(catalogDirectory);
            new CatalogSensoryReadinessReportWriter().write(report, reportDirectory);
            return 0;
        } catch (IOException | JacksonException | IllegalArgumentException exception) {
            errors.println("카탈로그 감각 준비도 보고서를 생성하지 못했습니다: " + exception.getMessage());
            return FAILURE;
        }
    }
}
