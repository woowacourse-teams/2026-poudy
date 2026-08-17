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

@DisplayName("카탈로그 감각 모델 도구 실행")
public class CatalogSensoryModelToolsMainTest {

    @Test
    @DisplayName("snapshot을 만든 뒤 같은 모델과 비교한 diff를 출력한다")
    public void createsSnapshotAndDiff(@TempDir Path temporaryDirectory) throws Exception {
        Path snapshotDirectory = temporaryDirectory.resolve("snapshot");
        Path diffDirectory = temporaryDirectory.resolve("diff");
        ByteArrayOutputStream errors = new ByteArrayOutputStream();

        int snapshotStatus = CatalogSensoryModelSnapshotMain.run(
                new String[] {fixture("valid").toString(), snapshotDirectory.toString()},
                new PrintStream(errors, true, StandardCharsets.UTF_8));
        int diffStatus = CatalogSensoryModelDiffMain.run(
                new String[] {
                        snapshotDirectory.resolve(CatalogSensoryModelSnapshotWriter.FILE_NAME).toString(),
                        fixture("valid").toString(),
                        diffDirectory.toString()
                },
                new PrintStream(errors, true, StandardCharsets.UTF_8));

        assertThat(snapshotStatus).isZero();
        assertThat(diffStatus).isZero();
        assertThat(errors.toByteArray()).isEmpty();
        assertThat(diffDirectory.resolve(CatalogSensoryModelDiffWriter.JSON_FILE_NAME)).isRegularFile();
        assertThat(Files.readString(diffDirectory.resolve(CatalogSensoryModelDiffWriter.MARKDOWN_FILE_NAME)))
                .contains("Changed products: 0");
    }

    @Test
    @DisplayName("필수 인자가 없으면 사용법을 남기고 실패한다")
    public void rejectsMissingArguments() {
        ByteArrayOutputStream errors = new ByteArrayOutputStream();
        PrintStream errorStream = new PrintStream(errors, true, StandardCharsets.UTF_8);

        int snapshotStatus = CatalogSensoryModelSnapshotMain.run(new String[0], errorStream);
        int diffStatus = CatalogSensoryModelDiffMain.run(new String[0], errorStream);

        assertThat(snapshotStatus).isEqualTo(1);
        assertThat(diffStatus).isEqualTo(1);
        assertThat(errors.toString(StandardCharsets.UTF_8)).contains("사용법");
    }

    private Path fixture(String name) throws URISyntaxException {
        return Path.of(getClass().getResource("/catalog-sensory-readiness/" + name).toURI());
    }
}
