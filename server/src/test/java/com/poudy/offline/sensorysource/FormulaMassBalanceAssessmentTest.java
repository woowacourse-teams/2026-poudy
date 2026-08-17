package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValidationStatus;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("정확 처방 질량 보존 검증")
class FormulaMassBalanceAssessmentTest {

    @Test
    @DisplayName("원료 투입량 합계가 정확히 100이면 accepted다")
    void acceptsExactHundredPercentFormula() {
        FormulaMassBalanceAssessment assessment = FormulaMassBalanceAssessment.assess(
                List.of(input("water", "Water", "60.000"), input("oil", "Oil", "40.0")));

        assertThat(assessment.observedTotalMassPercent()).isEqualByComparingTo("100");
        assertThat(assessment.signedDifferenceFromHundred()).isEqualByComparingTo("0");
        assertThat(assessment.validationStatus()).isEqualTo(ValidationStatus.ACCEPTED);
        assertThat(assessment.observedTotalMassPercent()).isEqualTo(new BigDecimal("100"));
    }

    @Test
    @DisplayName("100보다 작거나 큰 합계를 재정규화하지 않고 signed difference와 함께 격리한다")
    void quarantinesMassImbalanceWithoutRenormalizing() {
        FormulaMassBalanceAssessment below = FormulaMassBalanceAssessment.assess(
                List.of(input("water", "Water", "99.99")));
        FormulaMassBalanceAssessment above = FormulaMassBalanceAssessment.assess(
                List.of(input("water", "Water", "60"), input("oil", "Oil", "50")));

        assertThat(below.observedTotalMassPercent()).isEqualByComparingTo("99.99");
        assertThat(below.signedDifferenceFromHundred()).isEqualByComparingTo("-0.01");
        assertThat(below.validationStatus()).isEqualTo(ValidationStatus.QUARANTINED);
        assertThat(above.observedTotalMassPercent()).isEqualByComparingTo("110");
        assertThat(above.signedDifferenceFromHundred()).isEqualByComparingTo("10");
        assertThat(above.validationStatus()).isEqualTo(ValidationStatus.QUARANTINED);
    }

    @Test
    @DisplayName("빈 목록과 null 원료 입력을 거부한다")
    void rejectsMissingFormulaInputs() {
        assertThatThrownBy(() -> FormulaMassBalanceAssessment.assess(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> FormulaMassBalanceAssessment.assess(List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> FormulaMassBalanceAssessment.assess(java.util.Arrays.asList((RawMaterialInput) null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("직접 생성해도 합계·차이·상태의 불변식을 우회할 수 없다")
    void rejectsInconsistentAssessmentValues() {
        assertThatThrownBy(
                () -> new FormulaMassBalanceAssessment(
                        new BigDecimal("99"),
                        BigDecimal.ZERO,
                        ValidationStatus.QUARANTINED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("차이");
        assertThatThrownBy(
                () -> new FormulaMassBalanceAssessment(
                        new BigDecimal("99"),
                        new BigDecimal("-1"),
                        ValidationStatus.ACCEPTED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("상태");
        assertThatThrownBy(
                () -> new FormulaMassBalanceAssessment(
                        new BigDecimal("100"),
                        BigDecimal.ZERO,
                        ValidationStatus.REJECTED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("상태");
        assertThatThrownBy(
                () -> new FormulaMassBalanceAssessment(
                        new BigDecimal("-1"),
                        new BigDecimal("-101"),
                        ValidationStatus.QUARANTINED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("음수");
    }

    private RawMaterialInput input(String id, String name, String amount) {
        IngredientResolution.Resolved ingredient = new IngredientResolution.Resolved(
                1L,
                "CANONICAL_ID_DIRECT",
                "ingredient-resolver-v1");
        RawMaterialComposition composition = new RawMaterialComposition.KnownComposition(
                List.of(
                        new RawMaterialComposition.KnownComponent(
                                ingredient,
                                name,
                                ComponentFraction.parse("1"))));
        return new RawMaterialInput(
                StableId.namespaced("raw-material", id),
                name,
                MassPercent.parse(amount),
                composition);
    }
}
