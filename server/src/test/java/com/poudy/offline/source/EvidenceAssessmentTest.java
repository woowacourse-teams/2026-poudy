package com.poudy.offline.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("observation별 근거 평가")
class EvidenceAssessmentTest {

    private static final StableId INDEPENDENCE_GROUP = StableId.namespaced("evidence-group", "evonik-formulations");
    private static final LocalDate REVIEWED_DATE = LocalDate.of(2026, 8, 18);

    @Test
    @DisplayName("평가 목적과 권위·직접성·독립성 및 검수 provenance를 보존한다")
    void preservesAssessmentProvenance() {
        EvidenceAssessment assessment = assessment(
                "exact-formula-composition",
                "supplier-primary",
                "direct-formula-table",
                INDEPENDENCE_GROUP,
                "reviewer-1",
                REVIEWED_DATE,
                ValueOrMissing.present("trade blend 내부 구성비는 공개되지 않음"));

        assertThat(assessment.purpose()).isEqualTo("exact-formula-composition");
        assertThat(assessment.authorityGrade()).isEqualTo("supplier-primary");
        assertThat(assessment.directnessGrade()).isEqualTo("direct-formula-table");
        assertThat(assessment.independenceGroup()).isEqualTo(INDEPENDENCE_GROUP);
        assertThat(assessment.reviewer()).isEqualTo("reviewer-1");
        assertThat(assessment.reviewedDate()).isEqualTo(REVIEWED_DATE);
        assertThat(assessment.limitationNote())
                .isEqualTo(ValueOrMissing.present("trade blend 내부 구성비는 공개되지 않음"));
    }

    @Test
    @DisplayName("한계가 없을 때도 tagged 결측 이유를 보존한다")
    void preservesMissingLimitationReason() {
        EvidenceAssessment assessment = assessment(
                "official-usage-instruction",
                "supplier-primary",
                "direct-usage-text",
                INDEPENDENCE_GROUP,
                "reviewer-1",
                REVIEWED_DATE,
                ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));

        assertThat(assessment.limitationNote())
                .isEqualTo(ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));
    }

    @Test
    @DisplayName("필수 평가 값과 tagged limitation이 없으면 거부한다")
    void rejectsMissingAssessmentValues() {
        assertThatThrownBy(
                () -> assessment(
                        " ",
                        "supplier-primary",
                        "direct-formula-table",
                        INDEPENDENCE_GROUP,
                        "reviewer-1",
                        REVIEWED_DATE,
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> assessment(
                        "exact-formula-composition",
                        " ",
                        "direct-formula-table",
                        INDEPENDENCE_GROUP,
                        "reviewer-1",
                        REVIEWED_DATE,
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> assessment(
                        "exact-formula-composition",
                        "supplier-primary",
                        " ",
                        INDEPENDENCE_GROUP,
                        "reviewer-1",
                        REVIEWED_DATE,
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> assessment(
                        "exact-formula-composition",
                        "supplier-primary",
                        "direct-formula-table",
                        null,
                        "reviewer-1",
                        REVIEWED_DATE,
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> assessment(
                        "exact-formula-composition",
                        "supplier-primary",
                        "direct-formula-table",
                        INDEPENDENCE_GROUP,
                        " ",
                        REVIEWED_DATE,
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> assessment(
                        "exact-formula-composition",
                        "supplier-primary",
                        "direct-formula-table",
                        INDEPENDENCE_GROUP,
                        "reviewer-1",
                        null,
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> assessment(
                        "exact-formula-composition",
                        "supplier-primary",
                        "direct-formula-table",
                        INDEPENDENCE_GROUP,
                        "reviewer-1",
                        REVIEWED_DATE,
                        null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static EvidenceAssessment assessment(
            String purpose,
            String authorityGrade,
            String directnessGrade,
            StableId independenceGroup,
            String reviewer,
            LocalDate reviewedDate,
            ValueOrMissing<String> limitationNote) {
        return new EvidenceAssessment(
                purpose,
                authorityGrade,
                directnessGrade,
                independenceGroup,
                reviewer,
                reviewedDate,
                limitationNote);
    }
}
