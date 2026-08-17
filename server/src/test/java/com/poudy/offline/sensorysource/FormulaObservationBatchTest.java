package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.ContentSha256;
import com.poudy.offline.source.EvidenceAssessment;
import com.poudy.offline.source.ExtractionMetadata;
import com.poudy.offline.source.InputManifestBuilder;
import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.RedistributionPermission;
import com.poudy.offline.source.SourceLocator;
import com.poudy.offline.source.SourceMetadata;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValidationStatus;
import com.poudy.offline.source.ValueOrMissing;
import com.poudy.product.domain.ApplicationType;
import com.poudy.product.domain.sensory.FormulaArchetype;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("정규화 처방 observation batch")
class FormulaObservationBatchTest {

    private static final String RESOLVER_VERSION = "ingredient-resolver-v1";
    private static final String CATEGORY_VERSION = "category-mapping-v1";
    private static final String APPLICATION_VERSION = "application-type-rule-v1";
    private static final String USAGE_FORM_VERSION = "usage-form-mapping-v1";
    private static final String FORMULATION_VERSION = "formulation-mapping-v1";

    @Test
    @DisplayName("원천 참조와 모든 mapping 버전이 일치하는 batch를 불변 목록으로 보존한다")
    void preservesReferencedSourcesAndConsistentVersions() {
        List<SourceMetadata> sources = new ArrayList<>(List.of(source("source-1")));
        List<FormulaObservation> observations = new ArrayList<>(
                List.of(
                        observation(
                                "observation-1",
                                "source-1",
                                RESOLVER_VERSION,
                                CATEGORY_VERSION,
                                APPLICATION_VERSION,
                                USAGE_FORM_VERSION,
                                FORMULATION_VERSION)));

        FormulaObservationBatch batch = new FormulaObservationBatch(
                metadata(),
                sources,
                observations);
        sources.clear();
        observations.clear();

        assertThat(batch.sources()).extracting(SourceMetadata::sourceId)
                .containsExactly(id("source", "source-1"));
        assertThat(batch.observations()).extracting(FormulaObservation::formulaObservationId)
                .containsExactly(id("formula-observation", "observation-1"));
        assertThatThrownBy(() -> batch.sources().clear())
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> batch.observations().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("중복 ID와 존재하지 않는 원천 참조를 거부한다")
    void rejectsDuplicateIdsAndMissingSourceReference() {
        FormulaObservation first = observation(
                "observation-1",
                "source-1",
                RESOLVER_VERSION,
                CATEGORY_VERSION,
                APPLICATION_VERSION,
                USAGE_FORM_VERSION,
                FORMULATION_VERSION);

        assertThatThrownBy(
                () -> new FormulaObservationBatch(
                        metadata(),
                        List.of(source("source-1"), source("source-1")),
                        List.of(first)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("원천 metadata ID");
        assertThatThrownBy(
                () -> new FormulaObservationBatch(
                        metadata(),
                        List.of(source("source-1")),
                        List.of(first, first)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("observation ID");
        assertThatThrownBy(
                () -> new FormulaObservationBatch(
                        metadata(),
                        List.of(source("source-2")),
                        List.of(first)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는 원천");
    }

    @Test
    @DisplayName("child의 resolver와 mapping 버전이 batch metadata에서 벗어나면 거부한다")
    void rejectsChildVersionDrift() {
        assertVersionMismatch(
                "ingredient-resolver-v2",
                CATEGORY_VERSION,
                APPLICATION_VERSION,
                USAGE_FORM_VERSION,
                FORMULATION_VERSION,
                "성분 resolver");
        assertVersionMismatch(
                RESOLVER_VERSION,
                "category-mapping-v2",
                APPLICATION_VERSION,
                USAGE_FORM_VERSION,
                FORMULATION_VERSION,
                "category mapping");
        assertVersionMismatch(
                RESOLVER_VERSION,
                CATEGORY_VERSION,
                "application-type-rule-v2",
                USAGE_FORM_VERSION,
                FORMULATION_VERSION,
                "application type");
        assertVersionMismatch(
                RESOLVER_VERSION,
                CATEGORY_VERSION,
                APPLICATION_VERSION,
                "usage-form-mapping-v2",
                FORMULATION_VERSION,
                "사용 형태");
        assertVersionMismatch(
                RESOLVER_VERSION,
                CATEGORY_VERSION,
                APPLICATION_VERSION,
                USAGE_FORM_VERSION,
                "formulation-mapping-v2",
                "제형 mapping");
    }

    @Test
    @DisplayName("빈 batch와 null 구성요소를 거부한다")
    void rejectsMissingBatchValues() {
        FormulaObservation observation = observation(
                "observation-1",
                "source-1",
                RESOLVER_VERSION,
                CATEGORY_VERSION,
                APPLICATION_VERSION,
                USAGE_FORM_VERSION,
                FORMULATION_VERSION);

        assertThatThrownBy(
                () -> new FormulaObservationBatch(null, List.of(source("source-1")), List.of(observation)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new FormulaObservationBatch(metadata(), List.of(), List.of(observation)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new FormulaObservationBatch(
                        metadata(),
                        List.of(source("source-1")),
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new FormulaObservationBatch(
                        metadata(),
                        java.util.Arrays.asList((SourceMetadata) null),
                        List.of(observation)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static void assertVersionMismatch(
            String resolverVersion,
            String categoryVersion,
            String applicationVersion,
            String usageFormVersion,
            String formulationVersion,
            String expectedMessage) {
        FormulaObservation observation = observation(
                "observation-1",
                "source-1",
                resolverVersion,
                categoryVersion,
                applicationVersion,
                usageFormVersion,
                formulationVersion);

        assertThatThrownBy(
                () -> new FormulaObservationBatch(
                        metadata(),
                        List.of(source("source-1")),
                        List.of(observation)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(expectedMessage);
    }

    private static NormalizedObservationBatchMetadata metadata() {
        return new NormalizedObservationBatchMetadata(
                "sensory-source-data-contract-v1",
                RESOLVER_VERSION,
                CATEGORY_VERSION,
                APPLICATION_VERSION,
                USAGE_FORM_VERSION,
                FORMULATION_VERSION,
                ExactFormulaSignatureBuilder.VERSION,
                "data-builder-v1",
                new InputManifestBuilder()
                        .addLogicalFileInput(
                                "pilot.pdf",
                                "pilot".getBytes(StandardCharsets.UTF_8))
                        .build()
                        .manifestSha256());
    }

    private static SourceMetadata source(String localId) {
        return new SourceMetadata(
                id("source", localId),
                id("source-family", "publisher-formulations"),
                "Publisher",
                "Pilot formula",
                "formula-sheet",
                new SourceLocator.PublicUrl(URI.create("https://example.com/formula/" + localId)),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                LocalDate.of(2026, 8, 18),
                ValueOrMissing.present("revision-1"),
                new ContentSha256("01".repeat(32)),
                RedistributionPermission.UNKNOWN,
                "재배포 상태 검수 전",
                ValueOrMissing.missing(MissingReason.NOT_COLLECTED),
                new ExtractionMetadata(
                        "manual-pdf-review",
                        "extractor-v1",
                        id("extraction-manifest", localId)));
    }

    private static FormulaObservation observation(
            String observationId,
            String sourceId,
            String resolverVersion,
            String categoryVersion,
            String applicationVersion,
            String usageFormVersion,
            String formulationVersion) {
        RawMaterialInput input = input(resolverVersion);
        List<RawMaterialInput> inputs = List.of(input);
        return new FormulaObservation(
                id("formula-observation", observationId),
                id("formula-revision", observationId + "-v1"),
                id("source", sourceId),
                evidence(),
                new CanonicalCategoryMapping(
                        "face lotion",
                        ValueOrMissing.present(1L),
                        id("category-mapping", "official-title"),
                        categoryVersion,
                        CanonicalMappingResolution.EXACT),
                id("usage-variant", "default"),
                new ApplicationTypeDecision(
                        ApplicationType.LEAVE_ON,
                        ValueOrMissing.present("page 1, Directions"),
                        id("application-type-rule", "official-instruction"),
                        applicationVersion,
                        ApplicationTypeDecision.Resolution.EXACT,
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)),
                ValueOrMissing.present("Apply to face"),
                new CanonicalUsageFormMapping(
                        ValueOrMissing.present("apply to face"),
                        ValueOrMissing.present(id("usage-form", "face-application")),
                        id("usage-form-mapping", "official-instruction"),
                        usageFormVersion,
                        CanonicalMappingResolution.EXACT,
                        List.of()),
                new CanonicalFormulationMapping(
                        ValueOrMissing.present("oil-in-water emulsion"),
                        FormulaArchetype.O_W_EMULSION,
                        id("formulation-mapping", "official-expression"),
                        formulationVersion,
                        CanonicalMappingResolution.EXACT,
                        List.of()),
                inputs,
                FormulaMassBalanceAssessment.assess(inputs),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                List.of(),
                List.of(),
                ValidationStatus.ACCEPTED);
    }

    private static EvidenceAssessment evidence() {
        return new EvidenceAssessment(
                "formula-observation",
                "PRIMARY_OFFICIAL",
                "DIRECT_FORMULA_TABLE",
                id("independence-group", "publisher-formulations"),
                "reviewer",
                LocalDate.of(2026, 8, 18),
                ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));
    }

    private static RawMaterialInput input(String resolverVersion) {
        IngredientResolution resolution = new IngredientResolution.Resolved(
                1L,
                "ENGLISH_NAME_EXACT",
                resolverVersion);
        RawMaterialComposition composition = new RawMaterialComposition.KnownComposition(
                List.of(
                        new RawMaterialComposition.KnownComponent(
                                resolution,
                                "Water",
                                ComponentFraction.parse("1"))));
        return new RawMaterialInput(
                id("raw-material", "water"),
                "Water",
                FormulaAmountTestFixture.exact("100"),
                composition);
    }

    private static StableId id(String namespace, String localValue) {
        return StableId.namespaced(namespace, localValue);
    }
}
