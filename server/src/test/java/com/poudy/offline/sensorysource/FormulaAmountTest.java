package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("공개 처방 투입량 정규화")
class FormulaAmountTest {

    private static final StableId RULE_ID = StableId.namespaced(
            "formula-amount-rule",
            "published-amount");

    @Test
    @DisplayName("직접 공개된 십진수 표현과 같은 정확 질량을 보존한다")
    void preservesExactPublishedAmount() {
        FormulaAmount amount = FormulaAmount.exactPublished(
                " 5.00 ",
                MassPercent.parse("5"),
                RULE_ID,
                "formula-amount-normalization-v1");

        assertThat(amount.expressionAsPublished()).isEqualTo(" 5.00 ");
        assertThat(amount.normalizedMassPercent().value()).isEqualByComparingTo("5");
        assertThat(amount.resolution()).isEqualTo(FormulaAmount.Resolution.EXACT_PUBLISHED);
        assertThat(amount.targetTotalMassPercent())
                .isEqualTo(ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));
    }

    @Test
    @DisplayName("ad 100 원문과 나머지에서 도출한 질량 및 목표 합계를 함께 보존한다")
    void preservesDerivedToHundredAmount() {
        FormulaAmount amount = FormulaAmount.derivedToHundred(
                "ad 100.00",
                MassPercent.parse("84.87"),
                RULE_ID,
                "formula-amount-normalization-v1");

        assertThat(amount.expressionAsPublished()).isEqualTo("ad 100.00");
        assertThat(amount.normalizedMassPercent().value()).isEqualByComparingTo("84.87");
        assertThat(amount.resolution()).isEqualTo(FormulaAmount.Resolution.DERIVED_TO_HUNDRED);
        assertThat(amount.targetTotalMassPercent())
                .isEqualTo(ValueOrMissing.present(MassPercent.parse("100")));
    }

    @Test
    @DisplayName("q.s.나 불일치 수치를 직접 공개된 정확 질량으로 가장하지 않는다")
    void rejectsUnsupportedOrInconsistentExactExpression() {
        assertThatThrownBy(
                () -> FormulaAmount.exactPublished(
                        "q.s.",
                        MassPercent.parse("1"),
                        RULE_ID,
                        "formula-amount-normalization-v1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("단순 십진수");
        assertThatThrownBy(
                () -> FormulaAmount.exactPublished(
                        "5.00",
                        MassPercent.parse("6"),
                        RULE_ID,
                        "formula-amount-normalization-v1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("일치하지 않습니다");
    }

    @Test
    @DisplayName("해석 상태와 목표 합계 조합 및 필수 provenance를 강제한다")
    void rejectsInvalidResolutionCombinationAndMissingProvenance() {
        assertThatThrownBy(
                () -> new FormulaAmount(
                        "5",
                        MassPercent.parse("5"),
                        FormulaAmount.Resolution.EXACT_PUBLISHED,
                        RULE_ID,
                        "formula-amount-normalization-v1",
                        ValueOrMissing.present(MassPercent.parse("100"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("목표 합계");
        assertThatThrownBy(
                () -> new FormulaAmount(
                        "ad 100",
                        MassPercent.parse("95"),
                        FormulaAmount.Resolution.DERIVED_TO_HUNDRED,
                        RULE_ID,
                        "formula-amount-normalization-v1",
                        ValueOrMissing.missing(MissingReason.NOT_APPLICABLE)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("100%");
        assertThatThrownBy(
                () -> FormulaAmount.exactPublished(
                        "5",
                        MassPercent.parse("5"),
                        null,
                        "formula-amount-normalization-v1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> FormulaAmount.exactPublished(
                        "5",
                        MassPercent.parse("5"),
                        RULE_ID,
                        " "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
