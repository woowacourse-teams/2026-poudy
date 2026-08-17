package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.catalogsensory.CatalogSensoryModelSnapshot.ProductInference;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@DisplayName("카탈로그 감각 모델 snapshot")
public class CatalogSensoryModelSnapshotTest {

    private final CatalogSensoryReadinessAnalyzer analyzer = new CatalogSensoryReadinessAnalyzer();

    @Test
    @DisplayName("유효한 catalog의 제품별 추론을 ID 오름차순으로 보존한다")
    public void capturesComparableProductInference() throws Exception {
        CatalogSensoryModelSnapshot snapshot = analyzer.analyzeModelSnapshot(fixture("valid"));

        assertThat(snapshot.inputs())
                .extracting(CatalogSensoryReadinessReport.InputFile::name)
                .containsExactly("products.json", "ingredients.json", "categories.json");
        assertThat(snapshot.products())
                .extracting(ProductInference::productId)
                .containsExactly(10L, 11L);
        assertThat(snapshot.products().getFirst().moistureLevel()).isEqualTo(2);
        assertThat(snapshot.products().getFirst().oilLevel()).isZero();
        assertThat(snapshot.modelVersion().dataBuilderVersion())
                .isEqualTo("product-sensory-builder-v0.1");
    }

    @Test
    @DisplayName("제품을 빠짐없이 비교할 수 없는 catalog는 snapshot을 만들지 않는다")
    public void rejectsCatalogWithSkippedProducts() {
        assertThatThrownBy(() -> analyzer.analyzeModelSnapshot(fixture("quality-issues")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("전 제품을 추론");
    }

    @Test
    @DisplayName("snapshot JSON은 반복 생성해도 같고 다시 읽을 수 있다")
    public void writesDeterministicRoundTrip(@TempDir Path temporaryDirectory) throws Exception {
        CatalogSensoryModelSnapshot snapshot = analyzer.analyzeModelSnapshot(fixture("valid"));
        CatalogSensoryModelSnapshotWriter writer = new CatalogSensoryModelSnapshotWriter();

        Path target = writer.write(snapshot, temporaryDirectory);
        byte[] first = Files.readAllBytes(target);
        writer.write(snapshot, temporaryDirectory);

        assertThat(Files.readAllBytes(target)).containsExactly(first);
        assertThat(new CatalogSensoryModelSnapshotReader().read(target)).isEqualTo(snapshot);
    }

    @Test
    @DisplayName("snapshot 제품 ID는 중복 없이 오름차순이어야 한다")
    public void requiresSortedUniqueProductIds() throws Exception {
        CatalogSensoryModelSnapshot valid = analyzer.analyzeModelSnapshot(fixture("valid"));

        assertThatThrownBy(
                () -> new CatalogSensoryModelSnapshot(
                        valid.schemaVersion(),
                        valid.toolVersion(),
                        valid.modelVersion(),
                        valid.inputs(),
                        valid.products().reversed()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("오름차순");
    }

    @Test
    @DisplayName("제품 결과가 없는 snapshot은 비교 기준이 될 수 없다")
    public void rejectsEmptyProductResults() throws Exception {
        CatalogSensoryModelSnapshot valid = analyzer.analyzeModelSnapshot(fixture("valid"));

        assertThatThrownBy(
                () -> new CatalogSensoryModelSnapshot(
                        valid.schemaVersion(),
                        valid.toolVersion(),
                        valid.modelVersion(),
                        valid.inputs(),
                        java.util.List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("비어 있을 수 없습니다");
    }

    private Path fixture(String name) throws URISyntaxException {
        return Path.of(getClass().getResource("/catalog-sensory-readiness/" + name).toURI());
    }
}
