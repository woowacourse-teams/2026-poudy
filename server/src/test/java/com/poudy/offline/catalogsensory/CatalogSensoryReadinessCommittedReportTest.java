package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("커밋된 카탈로그 감각 준비도 보고서")
public class CatalogSensoryReadinessCommittedReportTest {

    private static final Path REPORT_DIRECTORY = Path.of("docs", "product");
    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    private final CatalogSensoryReadinessReportWriter writer = new CatalogSensoryReadinessReportWriter();

    @Test
    @DisplayName("현재 도구 버전의 canonical JSON과 Markdown 쌍이다")
    public void matchesCurrentReportContractAndWriter() throws Exception {
        Path jsonPath = REPORT_DIRECTORY.resolve(CatalogSensoryReadinessReportWriter.JSON_FILE_NAME);
        Path markdownPath = REPORT_DIRECTORY.resolve(CatalogSensoryReadinessReportWriter.MARKDOWN_FILE_NAME);
        String json = Files.readString(jsonPath, StandardCharsets.UTF_8);
        String markdown = Files.readString(markdownPath, StandardCharsets.UTF_8);
        CatalogSensoryReadinessReport report = MAPPER.readValue(json, CatalogSensoryReadinessReport.class);

        assertThat(report.schemaVersion()).isEqualTo(CatalogSensoryReadinessReport.SCHEMA_VERSION);
        assertThat(report.toolVersion()).isEqualTo(CatalogSensoryReadinessReport.TOOL_VERSION);
        assertThat(writer.renderJson(report)).isEqualTo(json);
        assertThat(writer.renderMarkdown(report)).isEqualTo(markdown);
    }
}
