package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@DisplayName("카탈로그 감각 모델 diff 출력")
public class CatalogSensoryModelDiffWriterTest {

    @Test
    @DisplayName("같은 snapshot의 diff는 결정적인 JSON과 Markdown 쌍으로 저장한다")
    public void writesDeterministicReportPair(@TempDir Path temporaryDirectory) throws Exception {
        CatalogSensoryModelSnapshot snapshot = new CatalogSensoryReadinessAnalyzer()
                .analyzeModelSnapshot(fixture("valid"));
        CatalogSensoryModelDiff report = new CatalogSensoryModelDiffAnalyzer()
                .compare(snapshot, snapshot);
        CatalogSensoryModelDiffWriter writer = new CatalogSensoryModelDiffWriter();

        writer.write(report, temporaryDirectory);
        byte[] firstJson = Files.readAllBytes(temporaryDirectory.resolve(writer.JSON_FILE_NAME));
        byte[] firstMarkdown = Files.readAllBytes(temporaryDirectory.resolve(writer.MARKDOWN_FILE_NAME));
        writer.write(report, temporaryDirectory);

        assertThat(Files.readAllBytes(temporaryDirectory.resolve(writer.JSON_FILE_NAME)))
                .containsExactly(firstJson);
        assertThat(Files.readAllBytes(temporaryDirectory.resolve(writer.MARKDOWN_FILE_NAME)))
                .containsExactly(firstMarkdown);
        assertThat(Files.readString(temporaryDirectory.resolve(writer.MARKDOWN_FILE_NAME)))
                .contains("Changed products: 0")
                .contains("변경된 제품이 없다.");
    }

    private Path fixture(String name) throws URISyntaxException {
        return Path.of(getClass().getResource("/catalog-sensory-readiness/" + name).toURI());
    }
}
