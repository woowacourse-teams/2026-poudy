package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.catalogsensory.CatalogSensoryModelSnapshot.ProductInference;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.InputFile;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카탈로그 감각 모델 diff 분석")
public class CatalogSensoryModelDiffAnalyzerTest {

    private static final List<InputFile> INPUTS = List.of(
            new InputFile("products.json", 10, "a".repeat(64)),
            new InputFile("ingredients.json", 20, "b".repeat(64)),
            new InputFile("categories.json", 30, "c".repeat(64)));

    private final CatalogSensoryModelDiffAnalyzer analyzer = new CatalogSensoryModelDiffAnalyzer();

    @Test
    @DisplayName("같은 catalog의 단계·confidence 변화를 제품별로 집계한다")
    public void comparesOnlyModelChanges() {
        CatalogSensoryModelSnapshot baseline = snapshot(
                "profile-v1",
                List.of(
                        new ProductInference(1, 2, 1, 0, new BigDecimal("0.30")),
                        new ProductInference(2, 4, 2, 2, new BigDecimal("0.50"))));
        CatalogSensoryModelSnapshot candidate = snapshot(
                "profile-v2",
                List.of(
                        new ProductInference(1, 2, 3, 0, new BigDecimal("0.40")),
                        new ProductInference(2, 4, 1, 3, new BigDecimal("0.40"))));

        CatalogSensoryModelDiff report = analyzer.compare(baseline, candidate);

        assertThat(report.comparedProducts()).isEqualTo(2);
        assertThat(report.changedProducts()).hasSize(2);
        assertThat(report.moisture().unchanged()).isZero();
        assertThat(report.moisture().increased()).isEqualTo(1);
        assertThat(report.moisture().decreased()).isEqualTo(1);
        assertThat(report.moisture().changedByAtLeastTwo()).isEqualTo(1);
        assertThat(delta(report.moisture(), -1)).isEqualTo(1);
        assertThat(delta(report.moisture(), 2)).isEqualTo(1);
        assertThat(report.oil().unchanged()).isEqualTo(1);
        assertThat(report.oil().increased()).isEqualTo(1);
        assertThat(report.confidence().increased()).isEqualTo(1);
        assertThat(report.confidence().decreased()).isEqualTo(1);
        assertThat(report.confidence().meanDelta()).isEqualByComparingTo("0.0000");
        assertThat(report.confidence().maximumAbsoluteDelta()).isEqualByComparingTo("0.1");
    }

    @Test
    @DisplayName("입력 내용 해시가 다르면 데이터 변화와 모델 변화를 섞어 비교하지 않는다")
    public void rejectsDifferentCatalogInputs() {
        CatalogSensoryModelSnapshot baseline = snapshot(
                "profile-v1",
                List.of(new ProductInference(1, 2, 1, 0, new BigDecimal("0.3"))));
        CatalogSensoryModelSnapshot candidate = new CatalogSensoryModelSnapshot(
                CatalogSensoryModelSnapshot.SCHEMA_VERSION,
                CatalogSensoryModelSnapshot.TOOL_VERSION,
                version("profile-v2"),
                List.of(new InputFile("products.json", 11, "d".repeat(64))),
                List.of(new ProductInference(1, 2, 1, 0, new BigDecimal("0.3"))));

        assertThatThrownBy(() -> analyzer.compare(baseline, candidate))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("동일한 catalog 입력 해시");
    }

    @Test
    @DisplayName("변경이 없으면 제품 diff를 만들지 않는다")
    public void omitsUnchangedProducts() {
        CatalogSensoryModelSnapshot snapshot = snapshot(
                "profile-v1",
                List.of(new ProductInference(1, 2, 1, 0, new BigDecimal("0.3"))));

        CatalogSensoryModelDiff report = analyzer.compare(snapshot, snapshot);

        assertThat(report.changedProducts()).isEmpty();
        assertThat(report.moisture().unchanged()).isEqualTo(1);
        assertThat(report.oil().unchanged()).isEqualTo(1);
        assertThat(report.confidence().unchanged()).isEqualTo(1);
    }

    @Test
    @DisplayName("결과를 바꾸고도 모델 구성 버전을 유지하면 비교를 거부한다")
    public void rejectsChangedBehaviorWithoutVersionChange() {
        CatalogSensoryModelSnapshot baseline = snapshot(
                "profile-v1",
                List.of(new ProductInference(1, 2, 1, 0, new BigDecimal("0.3"))));
        CatalogSensoryModelSnapshot changed = snapshot(
                "profile-v1",
                List.of(new ProductInference(1, 2, 2, 0, new BigDecimal("0.3"))));

        assertThatThrownBy(() -> analyzer.compare(baseline, changed))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("모델 구성 버전");
    }

    private static int delta(CatalogSensoryModelDiff.AxisChanges changes, int delta) {
        return changes.deltas().stream()
                .filter(count -> count.delta() == delta)
                .findFirst()
                .orElseThrow()
                .products();
    }

    private static CatalogSensoryModelSnapshot snapshot(
            String profileVersion,
            List<ProductInference> products) {
        return new CatalogSensoryModelSnapshot(
                CatalogSensoryModelSnapshot.SCHEMA_VERSION,
                CatalogSensoryModelSnapshot.TOOL_VERSION,
                version(profileVersion),
                INPUTS,
                products);
    }

    private static SensoryModelVersion version(String profileVersion) {
        return new SensoryModelVersion(
                profileVersion,
                "prior-v1",
                "level-v1",
                "protocol-v1",
                "builder-v1");
    }
}
