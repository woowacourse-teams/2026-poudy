package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@DisplayName("카탈로그 감각 준비도 명령")
public class CatalogSensoryReadinessMainTest {

    @TempDir
    private Path temporaryDirectory;

    @Test
    @DisplayName("인자가 없으면 사용법을 남기고 실패한다")
    public void rejectsMissingArguments() {
        ByteArrayOutputStream errors = new ByteArrayOutputStream();

        int status = CatalogSensoryReadinessMain.run(
                new String[0],
                new PrintStream(errors, true, StandardCharsets.UTF_8));

        assertThat(status).isEqualTo(1);
        assertThat(errors.toString(StandardCharsets.UTF_8)).contains("사용법");
    }

    @Test
    @DisplayName("입력이 잘못되면 기존 보고서 쌍을 보존한다")
    public void preservesExistingReportsWhenInputFails() throws Exception {
        Path output = Files.createDirectory(temporaryDirectory.resolve("reports"));
        Path json = output.resolve(CatalogSensoryReadinessReportWriter.JSON_FILE_NAME);
        Path markdown = output.resolve(CatalogSensoryReadinessReportWriter.MARKDOWN_FILE_NAME);
        Files.writeString(json, "previous-json", StandardCharsets.UTF_8);
        Files.writeString(markdown, "previous-markdown", StandardCharsets.UTF_8);
        ByteArrayOutputStream errors = new ByteArrayOutputStream();

        int status = CatalogSensoryReadinessMain.run(
                new String[] {fixture("malformed").toString(), output.toString()},
                new PrintStream(errors, true, StandardCharsets.UTF_8));

        assertThat(status).isEqualTo(1);
        assertThat(Files.readString(json, StandardCharsets.UTF_8)).isEqualTo("previous-json");
        assertThat(Files.readString(markdown, StandardCharsets.UTF_8)).isEqualTo("previous-markdown");
        assertThat(errors.toString(StandardCharsets.UTF_8)).contains("최상위 필드는 배열");
    }

    @Test
    @DisplayName("유효한 외부 디렉터리에서 두 보고서를 생성한다")
    public void createsReportPair() throws Exception {
        Path output = temporaryDirectory.resolve("reports");

        int status = CatalogSensoryReadinessMain.run(
                new String[] {fixture("valid").toString(), output.toString()},
                System.err);

        assertThat(status).isZero();
        assertThat(output.resolve(CatalogSensoryReadinessReportWriter.JSON_FILE_NAME)).isRegularFile();
        assertThat(output.resolve(CatalogSensoryReadinessReportWriter.MARKDOWN_FILE_NAME)).isRegularFile();
    }

    private Path fixture(String name) throws URISyntaxException {
        return Path.of(getClass().getResource("/catalog-sensory-readiness/" + name).toURI());
    }
}
