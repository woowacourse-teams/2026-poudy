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
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("canonical 사용 형태 mapping")
class CanonicalUsageFormMappingTest {

    private static final StableId RULE_ID = StableId.namespaced("usage-form-mapping", "official-expression");
    private static final StableId LOTION = usageFormId("lotion");
    private static final StableId PAD = usageFormId("pad");
    private static final StableId SHEET = usageFormId("sheet-mask");

    @Test
    @DisplayName("원문 근거가 있는 exact와 reviewed 사용 형태 ID를 보존한다")
    void preservesResolvedUsageFormMapping() {
        CanonicalUsageFormMapping exact = mapping(
                ValueOrMissing.present("lotion"),
                ValueOrMissing.present(LOTION),
                EXACT,
                List.of());
        CanonicalUsageFormMapping reviewed = mapping(
                ValueOrMissing.present("toner pad"),
                ValueOrMissing.present(PAD),
                REVIEWED,
                List.of());

        assertThat(exact.observedExpression()).isEqualTo(ValueOrMissing.present("lotion"));
        assertThat(exact.canonicalUsageFormId()).isEqualTo(ValueOrMissing.present(LOTION));
        assertThat(exact.mappingRuleId()).isEqualTo(RULE_ID);
        assertThat(exact.mappingVersion()).isEqualTo("usage-form-mapping-v1");
        assertThat(exact.resolution()).isEqualTo(EXACT);
        assertThat(exact.candidateUsageFormIds()).isEmpty();
        assertThat(reviewed.resolution()).isEqualTo(REVIEWED);
    }

    @Test
    @DisplayName("공식 원문이 없거나 해석할 수 없으면 unresolved로 보존한다")
    void preservesUnresolvedUsageFormMapping() {
        CanonicalUsageFormMapping missingExpression = mapping(
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                UNRESOLVED,
                List.of());
        CanonicalUsageFormMapping unknownExpression = mapping(
                ValueOrMissing.present("daily treatment"),
                ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                UNRESOLVED,
                List.of());

        assertThat(missingExpression.canonicalUsageFormId())
                .isEqualTo(ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY));
        assertThat(unknownExpression.observedExpression())
                .isEqualTo(ValueOrMissing.present("daily treatment"));
    }

    @Test
    @DisplayName("모호한 사용 형태 후보를 안정 ID 순서의 불변 목록으로 보존한다")
    void preservesAmbiguousCandidatesDeterministically() {
        CanonicalUsageFormMapping mapping = mapping(
                ValueOrMissing.present("mask pad"),
                ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                AMBIGUOUS,
                List.of(SHEET, PAD));

        assertThat(mapping.candidateUsageFormIds()).containsExactly(PAD, SHEET);
        assertThatThrownBy(() -> mapping.candidateUsageFormIds().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("확정된 사용 형태에는 원문과 canonical ID만 허용한다")
    void rejectsInvalidResolvedMapping() {
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                        ValueOrMissing.present(LOTION),
                        EXACT,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("원문 표현");
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("lotion"),
                        ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                        REVIEWED,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("canonical ID");
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("lotion"),
                        ValueOrMissing.present(LOTION),
                        EXACT,
                        List.of(PAD)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("후보 ID");
    }

    @Test
    @DisplayName("미해결 상태에는 canonical ID와 후보 ID가 없어야 한다")
    void rejectsInvalidUnresolvedMapping() {
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("lotion"),
                        ValueOrMissing.present(LOTION),
                        UNRESOLVED,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("mask"),
                        ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                        UNRESOLVED,
                        List.of(PAD)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("모호한 상태에는 둘 이상의 서로 다른 후보 ID만 허용한다")
    void rejectsInvalidAmbiguousCandidates() {
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("mask"),
                        ValueOrMissing.present(PAD),
                        AMBIGUOUS,
                        List.of(PAD, SHEET)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("mask"),
                        ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                        AMBIGUOUS,
                        List.of(PAD)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("mask"),
                        ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                        AMBIGUOUS,
                        List.of(PAD, PAD)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("중복");
    }

    @Test
    @DisplayName("모든 필수 값과 빈 mapping 버전을 거부한다")
    void rejectsMissingRequiredValues() {
        assertThatThrownBy(
                () -> mapping(null, ValueOrMissing.present(LOTION), EXACT, List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(ValueOrMissing.present("lotion"), null, EXACT, List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new CanonicalUsageFormMapping(
                        ValueOrMissing.present("lotion"),
                        ValueOrMissing.present(LOTION),
                        null,
                        "usage-form-mapping-v1",
                        EXACT,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new CanonicalUsageFormMapping(
                        ValueOrMissing.present("lotion"),
                        ValueOrMissing.present(LOTION),
                        RULE_ID,
                        " ",
                        EXACT,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("lotion"),
                        ValueOrMissing.present(LOTION),
                        null,
                        List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> mapping(
                        ValueOrMissing.present("lotion"),
                        ValueOrMissing.present(LOTION),
                        EXACT,
                        null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static CanonicalUsageFormMapping mapping(
            ValueOrMissing<String> observedExpression,
            ValueOrMissing<StableId> canonicalUsageFormId,
            CanonicalMappingResolution resolution,
            List<StableId> candidates) {
        return new CanonicalUsageFormMapping(
                observedExpression,
                canonicalUsageFormId,
                RULE_ID,
                "usage-form-mapping-v1",
                resolution,
                candidates);
    }

    private static StableId usageFormId(String value) {
        return StableId.namespaced("usage-form", value);
    }
}
