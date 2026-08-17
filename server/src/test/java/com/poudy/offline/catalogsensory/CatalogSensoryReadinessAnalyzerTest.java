package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.net.URISyntaxException;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카탈로그 감각 준비도 분석")
public class CatalogSensoryReadinessAnalyzerTest {

    private final CatalogSensoryReadinessAnalyzer analyzer = new CatalogSensoryReadinessAnalyzer();

    @Test
    @DisplayName("카테고리 경로와 유수분 필드 상태, 성분 분포를 구분해 집계한다")
    public void summarizesValidCatalogWithoutLosingMissingFieldState() throws Exception {
        CatalogSensoryReadinessReport report = analyzer.analyze(fixture("valid"));

        assertThat(report.catalog().products()).isEqualTo(2);
        assertThat(report.catalog().ingredients()).isEqualTo(4);
        assertThat(report.catalog().referencedUniqueIngredients()).isEqualTo(4);
        assertThat(report.categories())
                .extracting(
                        CatalogSensoryReadinessReport.CategoryCount::id,
                        CatalogSensoryReadinessReport.CategoryCount::parentId,
                        CatalogSensoryReadinessReport.CategoryCount::path,
                        CatalogSensoryReadinessReport.CategoryCount::products)
                .containsExactly(
                        tuple(2L, 1L, "스킨케어/스킨/토너", 1L),
                        tuple(4L, 1L, "스킨케어/크림", 1L));

        assertThat(report.levels().moistureLevel())
                .isEqualTo(new CatalogSensoryReadinessReport.LevelStatus(1, 1, 0, 0));
        assertThat(report.levels().oilLevel())
                .isEqualTo(new CatalogSensoryReadinessReport.LevelStatus(1, 0, 1, 0));
        assertThat(report.ingredientCountDistribution().minimum()).isEqualTo(2);
        assertThat(report.ingredientCountDistribution().median()).isEqualTo(2);
        assertThat(report.ingredientCountDistribution().maximum()).isEqualTo(3);
        assertThat(report.ingredientCountDistribution().mean()).isEqualByComparingTo("2.50");
    }

    @Test
    @DisplayName("runtime과 같은 v0 estimator로 레벨·confidence·category 분포를 만든다")
    public void summarizesRuntimeInferenceWithoutReadingManualLevels() throws Exception {
        CatalogSensoryReadinessReport report = analyzer.analyze(fixture("valid"));

        assertThat(report.inference().candidateProducts()).isEqualTo(2);
        assertThat(report.inference().inferredProducts()).isEqualTo(2);
        assertThat(report.inference().skippedProducts()).isZero();
        assertThat(report.inference().moistureLevels())
                .isEqualTo(new CatalogSensoryReadinessReport.LevelDistribution(0, 0, 2, 0));
        assertThat(report.inference().oilLevels())
                .isEqualTo(new CatalogSensoryReadinessReport.LevelDistribution(1, 0, 1, 0));
        assertThat(report.inference().levelPairs())
                .containsExactly(
                        new CatalogSensoryReadinessReport.LevelPairCount(2, 0, 1),
                        new CatalogSensoryReadinessReport.LevelPairCount(2, 2, 1));
        assertThat(report.inference().confidence().minimum()).isEqualByComparingTo("0.35");
        assertThat(report.inference().confidence().maximum()).isEqualByComparingTo("0.43");
        assertThat(report.inference().confidence().mean()).isEqualByComparingTo("0.3900");
        assertThat(report.inference().modelVersion().dataBuilderVersion())
                .isEqualTo("product-sensory-builder-v0.1");
        assertThat(report.inference().categories())
                .extracting(CatalogSensoryReadinessReport.CategoryInference::id)
                .containsExactly(2L, 4L);
    }

    @Test
    @DisplayName("역할 커버리지와 공개 함량, 선별 후보를 서로 다른 지표로 만든다")
    public void separatesRoleCoverageAmountsAndScreeningCandidates() throws Exception {
        CatalogSensoryReadinessReport report = analyzer.analyze(fixture("valid"));

        assertThat(report.roleCoverage().recognizedFormulationRole())
                .isEqualTo(new CatalogSensoryReadinessReport.Coverage(3, 4, 4, 5));
        assertThat(report.roleCoverage().sensoryScreeningRole())
                .isEqualTo(new CatalogSensoryReadinessReport.Coverage(2, 4, 2, 5));
        assertThat(report.disclosedAmounts().products()).isEqualTo(1);
        assertThat(report.disclosedAmounts().references()).isEqualTo(1);
        assertThat(report.disclosedAmounts().types()).containsEntry("exact", 1);
        assertThat(report.disclosedAmounts().units()).containsEntry("percent", 1);
        assertThat(report.sensoryRoleCandidates())
                .extracting(CatalogSensoryReadinessReport.IngredientFrequency::ingredientId)
                .containsExactly(2L, 3L);
        assertThat(report.frequentWithoutSensoryRole())
                .extracting(CatalogSensoryReadinessReport.IngredientFrequency::ingredientId)
                .containsExactly(1L, 4L);
        assertThat(report.roleUsage()).hasSize(28);
        assertThat(report.roleUsage()).extracting(CatalogSensoryReadinessReport.RoleUsage::role).isSorted();
        assertThat(roleUsage(report, "ABSORBENT"))
                .isEqualTo(new CatalogSensoryReadinessReport.RoleUsage("ABSORBENT", true, 0, 0, 0));
        assertThat(roleUsage(report, "MOISTURISING"))
                .isEqualTo(new CatalogSensoryReadinessReport.RoleUsage("MOISTURISING", true, 1, 1, 1));
        assertThat(roleUsage(report, "SKIN_CONDITIONING"))
                .isEqualTo(new CatalogSensoryReadinessReport.RoleUsage("SKIN_CONDITIONING", false, 1, 2, 2));
    }

    @Test
    @DisplayName("결함 레코드 때문에 중단하지 않고 중복과 미해결 참조를 누적한다")
    public void accumulatesQualityFindings() throws Exception {
        CatalogSensoryReadinessReport report = analyzer.analyze(fixture("quality-issues"));

        assertThat(report.catalog().malformedProducts()).isEqualTo(2);
        assertThat(report.catalog().malformedIngredients()).isEqualTo(2);
        assertThat(report.catalog().malformedCategories()).isEqualTo(1);
        assertThat(report.catalog().duplicateProductIds()).isEqualTo(1);
        assertThat(report.catalog().duplicateIngredientIds()).isEqualTo(1);
        assertThat(report.catalog().duplicateCategoryIds()).isEqualTo(1);
        assertThat(report.catalog().unknownCategoryReferences()).isEqualTo(2);
        assertThat(report.catalog().malformedTagMappings()).isEqualTo(1);
        assertThat(report.catalog().unrecognizedFormulationRoles()).isEqualTo(1);

        assertThat(report.ingredientLists().orderedArrays()).isEqualTo(2);
        assertThat(report.ingredientLists().missingOrInvalidArrays()).isEqualTo(1);
        assertThat(report.ingredientLists().emptyArrays()).isEqualTo(1);
        assertThat(report.ingredientLists().references()).isEqualTo(5);
        assertThat(report.ingredientLists().resolvedReferences()).isEqualTo(2);
        assertThat(report.ingredientLists().unresolvedReferences()).isEqualTo(1);
        assertThat(report.ingredientLists().malformedReferences()).isEqualTo(2);
        assertThat(report.ingredientLists().duplicateReferences()).isEqualTo(1);
        assertThat(report.ingredientLists().unresolvedIngredientIds()).containsExactly(999L);
        assertThat(report.ingredientLists().duplicates().get(0).firstPosition()).isEqualTo(1);
        assertThat(report.ingredientLists().duplicates().get(0).duplicatePosition()).isEqualTo(2);

        assertThat(report.disclosedAmounts().references()).isEqualTo(1);
        assertThat(report.disclosedAmounts().malformed()).isEqualTo(1);
        assertThat(report.levels().moistureLevel())
                .isEqualTo(new CatalogSensoryReadinessReport.LevelStatus(1, 0, 1, 1));
        assertThat(report.levels().oilLevel())
                .isEqualTo(new CatalogSensoryReadinessReport.LevelStatus(1, 1, 0, 1));
        assertThat(report.inference().candidateProducts()).isEqualTo(4);
        assertThat(report.inference().inferredProducts()).isZero();
        assertThat(report.inference().skippedProducts()).isEqualTo(4);
    }

    @Test
    @DisplayName("입력 메타데이터는 절대 경로나 시각 없이 파일명과 내용 해시만 가진다")
    public void recordsContentBasedInputIdentity() throws Exception {
        CatalogSensoryReadinessReport report = analyzer.analyze(fixture("valid"));

        assertThat(report.inputs())
                .extracting(CatalogSensoryReadinessReport.InputFile::name)
                .containsExactly("products.json", "ingredients.json", "categories.json");
        assertThat(report.inputs())
                .allSatisfy(input -> assertThat(input.sha256()).hasSize(64).matches("[0-9a-f]{64}"));
        assertThat(report.sourceFields().sourceUrlProducts()).isEqualTo(1);
        assertThat(report.sourceFields().officialIngredientOrderVerified()).isFalse();
    }

    private Path fixture(String name) throws URISyntaxException {
        return Path.of(getClass().getResource("/catalog-sensory-readiness/" + name).toURI());
    }

    private static CatalogSensoryReadinessReport.RoleUsage roleUsage(
            CatalogSensoryReadinessReport report,
            String role) {
        return report.roleUsage().stream()
                .filter(usage -> usage.role().equals(role))
                .findFirst()
                .orElseThrow();
    }
}
