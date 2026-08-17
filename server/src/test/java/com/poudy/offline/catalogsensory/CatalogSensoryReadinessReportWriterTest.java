package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@DisplayName("카탈로그 감각 준비도 보고서 출력")
public class CatalogSensoryReadinessReportWriterTest {

    @TempDir
    private Path temporaryDirectory;

    private final CatalogSensoryReadinessAnalyzer analyzer = new CatalogSensoryReadinessAnalyzer();
    private final CatalogSensoryReadinessReportWriter writer = new CatalogSensoryReadinessReportWriter();

    @Test
    @DisplayName("JSON과 Markdown은 같은 입력에서 바이트까지 동일하다")
    public void rendersDeterministically() throws Exception {
        CatalogSensoryReadinessReport report = analyzer.analyze(fixture("valid"));

        String firstJson = writer.renderJson(report);
        String secondJson = writer.renderJson(report);
        String firstMarkdown = writer.renderMarkdown(report);
        String secondMarkdown = writer.renderMarkdown(report);

        assertThat(firstJson).isEqualTo(secondJson).endsWith("\n").doesNotContain("\r");
        assertThat(firstMarkdown).isEqualTo(secondMarkdown).endsWith("\n").doesNotContain("\r");
        assertThat(firstJson)
                .contains("\"schemaVersion\" : \"catalog-sensory-readiness-v1\"")
                .contains("\"toolVersion\" : \"catalog-sensory-readiness-tool-v1\"");
        assertThat(firstMarkdown)
                .contains("같은 스키마·도구 버전과 같은 입력이면 같은 결과")
                .contains("외부 원문을 대조하지 않으므로 공식 전성분의 순서와 완전성은 검증하지 않았다")
                .contains("스킨케어/스킨/토너");
    }

    @Test
    @DisplayName("두 보고서를 전용 파일에 쓰고 반복 생성해도 내용이 바뀌지 않는다")
    public void writesStableReportPair() throws Exception {
        CatalogSensoryReadinessReport report = analyzer.analyze(fixture("valid"));

        writer.write(report, temporaryDirectory);
        byte[] firstJson = Files.readAllBytes(
                temporaryDirectory.resolve(CatalogSensoryReadinessReportWriter.JSON_FILE_NAME));
        byte[] firstMarkdown = Files.readAllBytes(
                temporaryDirectory.resolve(CatalogSensoryReadinessReportWriter.MARKDOWN_FILE_NAME));

        writer.write(report, temporaryDirectory);

        assertThat(
                Files.readAllBytes(
                        temporaryDirectory.resolve(CatalogSensoryReadinessReportWriter.JSON_FILE_NAME)))
                .isEqualTo(firstJson);
        assertThat(
                Files.readAllBytes(
                        temporaryDirectory.resolve(CatalogSensoryReadinessReportWriter.MARKDOWN_FILE_NAME)))
                .isEqualTo(firstMarkdown);
    }

    private Path fixture(String name) throws URISyntaxException {
        return Path.of(getClass().getResource("/catalog-sensory-readiness/" + name).toURI());
    }
}
