package com.poudy.offline.sensorysource;

import static com.poudy.offline.sensorysource.CanonicalMappingResolution.AMBIGUOUS;
import static com.poudy.offline.sensorysource.CanonicalMappingResolution.EXACT;
import static com.poudy.offline.sensorysource.CanonicalMappingResolution.REVIEWED;
import static com.poudy.offline.sensorysource.CanonicalMappingResolution.UNRESOLVED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import com.poudy.product.domain.sensory.FormulaArchetype;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("canonical 제형 mapping")
class CanonicalFormulationMappingTest {

    private static final StableId RULE_ID = StableId.namespaced("formulation-mapping", "official-expression");

    @Test
    @DisplayName("원문 근거가 있는 exact와 reviewed 제형을 보존한다")
    void preservesResolvedFormulationMapping() {
        CanonicalFormulationMapping exact = mapping(
                ValueOrMissing.present("oil-in-water emulsion"),
                FormulaArchetype.O_W_EMULSION,
                EXACT,
                List.of());
        CanonicalFormulationMapping reviewed = mapping(
                ValueOrMissing.present("hydrogel cream"),
                FormulaArchetype.HYDROGEL,
                REVIEWED,
                List.of());

        assertThat(exact.observedExpression())
                .isEqualTo(ValueOrMissing.present("oil-in-water emulsion"));
        assertThat(exact.formulaArchetype()).isEqualTo(FormulaArchetype.O_W_EMULSION);
        assertThat(exact.mappingRuleId()).isEqualTo(RULE_ID);
        assertThat(exact.mappingVersion()).isEqualTo("formulation-mapping-v1");
        assertThat(exact.resolution()).isEqualTo(EXACT);
        assertThat(exact.candidateArchetypes()).isEmpty();
        assertThat(reviewed.resolution()).isEqualTo(REVIEWED);
    }

    @Test
    @DisplayName("미해결 제형은 원문 존재 여부와 무관하게 unknown으로 보존한다")
    void preservesUnresolvedFormulationMapping() {
        CanonicalFormulationMapping missingExpression = mapping(
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                FormulaArchetype.UNKNOWN,
                UNRESOLVED,
                List.of());
        CanonicalFormulationMapping unknownExpression = mapping(
                ValueOrMissing.present("essence lotion"),
                FormulaArchetype.UNKNOWN,
                UNRESOLVED,
                List.of());

        assertThat(missingExpression.formulaArchetype()).isEqualTo(FormulaArchetype.UNKNOWN);
        assertThat(unknownExpression.observedExpression())
                .isEqualTo(ValueOrMissing.present("essence lotion"));
    }

    @Test
    @DisplayName("모호한 제형 후보를 enum 선언 순서의 불변 목록으로 보존한다")
    void preservesAmbiguousCandidatesDeterministically() {
        CanonicalFormulationMapping mapping = mapping(
                ValueOrMissing.present("emulsion"),
                FormulaArchetype.UNKNOWN,
                AMBIGUOUS,
                List.of(FormulaArchetype.W_O_EMULSION, FormulaArchetype.O_W_EMULSION));

        assertThat(mapping.candidateArchetypes())
                .containsExactly(
                        FormulaArchetype.O_W_EMULSION,
                        FormulaArchetype.W_O_EMULSION);
        assertThatThrownBy(() -> mapping.candidateArchetypes().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("확정된 제형에는 원문과 단일 non-unknown 결과만 허용한다")
    void rejectsInvalidResolvedMapping() {
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                        FormulaArchetype.HYDROGEL,
                        EXACT,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("원문 표현");
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("unknown"),
                        FormulaArchetype.UNKNOWN,
                        REVIEWED,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("UNKNOWN");
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("gel"),
                        FormulaArchetype.HYDROGEL,
                        EXACT,
                        List.of(FormulaArchetype.AQUEOUS_SOLUTION)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("후보 목록");
    }

    @Test
    @DisplayName("미해결 상태에는 unknown 결과와 빈 후보만 허용한다")
    void rejectsInvalidUnresolvedMapping() {
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("gel"),
                        FormulaArchetype.HYDROGEL,
                        UNRESOLVED,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("gel or emulsion"),
                        FormulaArchetype.UNKNOWN,
                        UNRESOLVED,
                        List.of(FormulaArchetype.HYDROGEL)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("모호한 상태에는 둘 이상의 서로 다른 실제 제형 후보가 필요하다")
    void rejectsInvalidAmbiguousCandidates() {
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("emulsion"),
                        FormulaArchetype.O_W_EMULSION,
                        AMBIGUOUS,
                        List.of(
                                FormulaArchetype.O_W_EMULSION,
                                FormulaArchetype.W_O_EMULSION)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("emulsion"),
                        FormulaArchetype.UNKNOWN,
                        AMBIGUOUS,
                        List.of(FormulaArchetype.O_W_EMULSION)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("emulsion"),
                        FormulaArchetype.UNKNOWN,
                        AMBIGUOUS,
                        List.of(
                                FormulaArchetype.O_W_EMULSION,
                                FormulaArchetype.O_W_EMULSION)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("중복");
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("emulsion"),
                        FormulaArchetype.UNKNOWN,
                        AMBIGUOUS,
                        List.of(FormulaArchetype.O_W_EMULSION, FormulaArchetype.UNKNOWN)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("UNKNOWN");
    }

    @Test
    @DisplayName("모든 필수 값과 빈 mapping 버전을 거부한다")
    void rejectsMissingRequiredValues() {
        assertThatThrownBy(() -> mapping(null, FormulaArchetype.HYDROGEL, EXACT, List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new CanonicalFormulationMapping(
                        ValueOrMissing.present("gel"),
                        null,
                        RULE_ID,
                        "formulation-mapping-v1",
                        EXACT,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new CanonicalFormulationMapping(
                        ValueOrMissing.present("gel"),
                        FormulaArchetype.HYDROGEL,
                        null,
                        "formulation-mapping-v1",
                        EXACT,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new CanonicalFormulationMapping(
                        ValueOrMissing.present("gel"),
                        FormulaArchetype.HYDROGEL,
                        RULE_ID,
                        " ",
                        EXACT,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("gel"),
                        FormulaArchetype.HYDROGEL,
                        null,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("gel"),
                        FormulaArchetype.HYDROGEL,
                        EXACT,
                        null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static CanonicalFormulationMapping mapping(
            ValueOrMissing<String> observedExpression,
            FormulaArchetype formulaArchetype,
            CanonicalMappingResolution resolution,
            List<FormulaArchetype> candidates) {
        return new CanonicalFormulationMapping(
                observedExpression,
                formulaArchetype,
                RULE_ID,
                "formulation-mapping-v1",
                resolution,
                candidates);
    }
}
