package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.EvidenceAssessment;
import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValidationStatus;
import com.poudy.offline.source.ValueOrMissing;
import com.poudy.product.domain.ApplicationType;
import com.poudy.product.domain.sensory.FormulaArchetype;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("정규화된 공개 처방 observation")
class FormulaObservationTest {

    @Test
    @DisplayName("원문 순서와 독립된 category·사용법·제형·물성 축을 보존한다")
    void preservesNormalizedObservationWithoutReorderingPublishedValues() {
        List<RawMaterialInput> inputs = new ArrayList<>(
                List.of(
                        input("water", "Water", "60", resolved(1L)),
                        input("oil", "Oil", "40", resolved(2L))));
        List<PhysicalPropertyMeasurement> measurements = new ArrayList<>(List.of(measurement()));
        List<String> sensoryTerms = new ArrayList<>(List.of("light skin feel", "fast absorbing"));
        FormulaMassBalanceAssessment massBalance = FormulaMassBalanceAssessment.assess(inputs);

        FormulaObservation observation = observation(
                inputs,
                massBalance,
                knownApplicationType(),
                measurements,
                sensoryTerms,
                ValidationStatus.ACCEPTED);
        inputs.clear();
        measurements.clear();
        sensoryTerms.clear();

        assertThat(observation.orderedRawMaterialInputs())
                .extracting(RawMaterialInput::rawMaterialNameAsPublished)
                .containsExactly("Water", "Oil");
        assertThat(observation.massBalanceAssessment().observedTotalMassPercent())
                .isEqualByComparingTo("100");
        assertThat(observation.physicalPropertyMeasurements()).containsExactly(measurement());
        assertThat(observation.claimedSensoryTerms())
                .containsExactly("light skin feel", "fast absorbing");
        assertThatThrownBy(() -> observation.orderedRawMaterialInputs().clear())
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> observation.physicalPropertyMeasurements().clear())
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> observation.claimedSensoryTerms().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("사용법이 없는 공개 처방을 unknown과 quarantined로 보존한다")
    void preservesUnknownApplicationTypeAsQuarantined() {
        List<RawMaterialInput> inputs = List.of(input("water", "Water", "100", resolved(1L)));

        FormulaObservation observation = observation(
                inputs,
                FormulaMassBalanceAssessment.assess(inputs),
                unknownApplicationType(),
                List.of(),
                List.of(),
                ValidationStatus.QUARANTINED);

        assertThat(observation.applicationTypeDecision().value())
                .isEqualTo(ApplicationType.UNKNOWN);
        assertThat(observation.validationStatus()).isEqualTo(ValidationStatus.QUARANTINED);
    }

    @Test
    @DisplayName("미확정 application type 또는 100이 아닌 합계를 accepted로 승격하지 않는다")
    void rejectsAcceptedObservationWithQuarantineReason() {
        List<RawMaterialInput> balanced = List.of(input("water", "Water", "100", resolved(1L)));
        List<RawMaterialInput> imbalanced = List.of(input("water", "Water", "99.9", resolved(1L)));

        assertThatThrownBy(
                () -> observation(
                        balanced,
                        FormulaMassBalanceAssessment.assess(balanced),
                        unknownApplicationType(),
                        List.of(),
                        List.of(),
                        ValidationStatus.ACCEPTED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("application type");
        assertThatThrownBy(
                () -> observation(
                        imbalanced,
                        FormulaMassBalanceAssessment.assess(imbalanced),
                        knownApplicationType(),
                        List.of(),
                        List.of(),
                        ValidationStatus.ACCEPTED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("질량 합계");
    }

    @Test
    @DisplayName("미해결 또는 모호한 성분 identity를 accepted로 승격하지 않는다")
    void rejectsAcceptedObservationWithUnresolvedIngredientIdentity() {
        IngredientResolution unresolved = new IngredientResolution.Unresolved(
                "vocabulary에 없음",
                "ingredient-resolver-v1");
        IngredientResolution ambiguous = new IngredientResolution.Ambiguous(
                List.of(1L, 2L),
                "복수 exact 후보",
                "ingredient-resolver-v1");

        assertAcceptedIdentityRejected(unresolved);
        assertAcceptedIdentityRejected(ambiguous);

        RawMaterialComposition unquantified = new RawMaterialComposition.UnquantifiedComposition(
                List.of(
                        new RawMaterialComposition.UnquantifiedComponent(
                                unresolved,
                                "Trade blend component")));
        assertAcceptedIdentityRejected(
                input(
                        "trade-blend",
                        "Trade Blend",
                        "100",
                        unquantified));
    }

    @Test
    @DisplayName("입력 원료와 다른 질량 평가를 함께 저장하지 않는다")
    void rejectsMassBalanceThatDoesNotMatchInputs() {
        List<RawMaterialInput> inputs = List.of(input("water", "Water", "100", resolved(1L)));
        FormulaMassBalanceAssessment inconsistent = FormulaMassBalanceAssessment.assess(
                List.of(input("water", "Water", "99", resolved(1L))));

        assertThatThrownBy(
                () -> observation(
                        inputs,
                        inconsistent,
                        knownApplicationType(),
                        List.of(),
                        List.of(),
                        ValidationStatus.QUARANTINED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("일치하지 않습니다");
    }

    @Test
    @DisplayName("필수 값, 원료 입력, 물성, 원문 감각 표현의 null과 공백을 거부한다")
    void rejectsMissingRequiredValues() {
        List<RawMaterialInput> inputs = List.of(input("water", "Water", "100", resolved(1L)));
        FormulaMassBalanceAssessment massBalance = FormulaMassBalanceAssessment.assess(inputs);

        assertThatThrownBy(
                () -> observation(
                        List.of(),
                        massBalance,
                        knownApplicationType(),
                        List.of(),
                        List.of(),
                        ValidationStatus.QUARANTINED))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> observation(
                        inputs,
                        massBalance,
                        knownApplicationType(),
                        java.util.Arrays.asList((PhysicalPropertyMeasurement) null),
                        List.of(),
                        ValidationStatus.QUARANTINED))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> observation(
                        inputs,
                        massBalance,
                        knownApplicationType(),
                        List.of(),
                        List.of(" "),
                        ValidationStatus.QUARANTINED))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new FormulaObservation(
                        null,
                        id("formula-revision", "v1"),
                        id("source-metadata", "source-1"),
                        evidence(),
                        categoryMapping(),
                        id("usage-variant", "default"),
                        knownApplicationType(),
                        ValueOrMissing.present("Apply to face"),
                        usageFormMapping(),
                        formulationMapping(),
                        inputs,
                        massBalance,
                        ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                        List.of(),
                        List.of(),
                        ValidationStatus.ACCEPTED))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static void assertAcceptedIdentityRejected(IngredientResolution resolution) {
        assertAcceptedIdentityRejected(input("material", "Material", "100", resolution));
    }

    private static void assertAcceptedIdentityRejected(RawMaterialInput input) {
        List<RawMaterialInput> inputs = List.of(input);

        assertThatThrownBy(
                () -> observation(
                        inputs,
                        FormulaMassBalanceAssessment.assess(inputs),
                        knownApplicationType(),
                        List.of(),
                        List.of(),
                        ValidationStatus.ACCEPTED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("identity");
    }

    private static FormulaObservation observation(
            List<RawMaterialInput> inputs,
            FormulaMassBalanceAssessment massBalance,
            ApplicationTypeDecision applicationType,
            List<PhysicalPropertyMeasurement> measurements,
            List<String> sensoryTerms,
            ValidationStatus status) {
        return new FormulaObservation(
                id("formula-observation", "pilot-1"),
                id("formula-revision", "v1"),
                id("source-metadata", "source-1"),
                evidence(),
                categoryMapping(),
                id("usage-variant", "default"),
                applicationType,
                ValueOrMissing.present("Apply to face"),
                usageFormMapping(),
                formulationMapping(),
                inputs,
                massBalance,
                ValueOrMissing.present("Combine phases and homogenize"),
                measurements,
                sensoryTerms,
                status);
    }

    private static EvidenceAssessment evidence() {
        return new EvidenceAssessment(
                "formula-observation",
                "PRIMARY_OFFICIAL",
                "DIRECT_FORMULA_TABLE",
                id("independence-group", "source-family-1"),
                "reviewer",
                LocalDate.of(2026, 8, 18),
                ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));
    }

    private static CanonicalCategoryMapping categoryMapping() {
        return new CanonicalCategoryMapping(
                "face lotion",
                ValueOrMissing.present(1L),
                id("category-mapping", "official-title"),
                "category-mapping-v1",
                CanonicalMappingResolution.EXACT);
    }

    private static CanonicalUsageFormMapping usageFormMapping() {
        return new CanonicalUsageFormMapping(
                ValueOrMissing.present("apply to face"),
                ValueOrMissing.present(id("usage-form", "face-application")),
                id("usage-form-mapping", "official-instruction"),
                "usage-form-mapping-v1",
                CanonicalMappingResolution.EXACT,
                List.of());
    }

    private static CanonicalFormulationMapping formulationMapping() {
        return new CanonicalFormulationMapping(
                ValueOrMissing.present("oil-in-water emulsion"),
                FormulaArchetype.O_W_EMULSION,
                id("formulation-mapping", "official-expression"),
                "formulation-mapping-v1",
                CanonicalMappingResolution.EXACT,
                List.of());
    }

    private static ApplicationTypeDecision knownApplicationType() {
        return new ApplicationTypeDecision(
                ApplicationType.LEAVE_ON,
                ValueOrMissing.present("page 1, Directions"),
                id("application-type-rule", "official-instruction"),
                "application-type-rule-v1",
                ApplicationTypeDecision.Resolution.EXACT,
                ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));
    }

    private static ApplicationTypeDecision unknownApplicationType() {
        return new ApplicationTypeDecision(
                ApplicationType.UNKNOWN,
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                id("application-type-rule", "official-instruction"),
                "application-type-rule-v1",
                ApplicationTypeDecision.Resolution.UNRESOLVED,
                ValueOrMissing.present("정상 사용 절차가 공개되지 않음"));
    }

    private static PhysicalPropertyMeasurement measurement() {
        return new PhysicalPropertyMeasurement(
                "Viscosity",
                "< 1,000",
                ValueOrMissing.present("mPa·s"),
                ValueOrMissing.present("Brookfield"),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                ValueOrMissing.present("25 °C"));
    }

    private static RawMaterialInput input(
            String id,
            String name,
            String amount,
            IngredientResolution resolution) {
        RawMaterialComposition composition = new RawMaterialComposition.KnownComposition(
                List.of(
                        new RawMaterialComposition.KnownComponent(
                                resolution,
                                name,
                                ComponentFraction.parse("1"))));
        return input(id, name, amount, composition);
    }

    private static RawMaterialInput input(
            String id,
            String name,
            String amount,
            RawMaterialComposition composition) {
        return new RawMaterialInput(
                id("raw-material", id),
                name,
                FormulaAmountTestFixture.exact(amount),
                composition);
    }

    private static IngredientResolution resolved(long ingredientId) {
        return new IngredientResolution.Resolved(
                ingredientId,
                "CANONICAL_ID_DIRECT",
                "ingredient-resolver-v1");
    }

    private static StableId id(String namespace, String value) {
        return StableId.namespaced(namespace, value);
    }
}
