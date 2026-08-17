package com.poudy.offline.sensorysource;

import com.poudy.offline.source.ValidationStatus;
import com.poudy.offline.source.ValueOrMissing;
import java.math.BigDecimal;
import java.util.List;

public record FormulaMassBalanceAssessment(
        BigDecimal observedTotalMassPercent,
        BigDecimal signedDifferenceFromHundred,
        ValidationStatus validationStatus) {

    private static final BigDecimal EXPECTED_TOTAL = new BigDecimal("100");

    public FormulaMassBalanceAssessment {
        observedTotalMassPercent = canonical(
                requireNonNegative(
                        observedTotalMassPercent,
                        "관측한 처방 질량 백분율 합계"));
        signedDifferenceFromHundred = canonical(
                requireValue(
                        signedDifferenceFromHundred,
                        "100 대비 처방 질량 백분율 차이"));
        if (validationStatus == null) {
            throw new IllegalArgumentException("처방 질량 보존 검증 상태가 필요합니다.");
        }

        BigDecimal expectedDifference = canonical(observedTotalMassPercent.subtract(EXPECTED_TOTAL));
        if (signedDifferenceFromHundred.compareTo(expectedDifference) != 0) {
            throw new IllegalArgumentException("처방 질량 백분율 합계와 100 대비 차이가 일치하지 않습니다.");
        }

        ValidationStatus expectedStatus = observedTotalMassPercent.compareTo(EXPECTED_TOTAL) == 0
                ? ValidationStatus.ACCEPTED
                : ValidationStatus.QUARANTINED;
        if (validationStatus != expectedStatus) {
            throw new IllegalArgumentException("처방 질량 백분율 합계와 검증 상태가 일치하지 않습니다.");
        }
    }

    public static FormulaMassBalanceAssessment assess(List<RawMaterialInput> orderedRawMaterialInputs) {
        if (orderedRawMaterialInputs == null || orderedRawMaterialInputs.isEmpty()) {
            throw new IllegalArgumentException("처방 원료 입력은 한 개 이상이어야 합니다.");
        }
        if (orderedRawMaterialInputs.stream().anyMatch(input -> input == null)) {
            throw new IllegalArgumentException("처방 원료 입력은 null일 수 없습니다.");
        }

        validateDerivedToHundredAmount(orderedRawMaterialInputs);

        BigDecimal total = orderedRawMaterialInputs.stream()
                .map(input -> input.formulaAmount().normalizedMassPercent().value())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal difference = total.subtract(EXPECTED_TOTAL);
        ValidationStatus status = difference.compareTo(BigDecimal.ZERO) == 0
                ? ValidationStatus.ACCEPTED
                : ValidationStatus.QUARANTINED;
        return new FormulaMassBalanceAssessment(total, difference, status);
    }

    private static void validateDerivedToHundredAmount(List<RawMaterialInput> inputs) {
        List<RawMaterialInput> derivedInputs = inputs.stream()
                .filter(input -> input.formulaAmount().resolution() == FormulaAmount.Resolution.DERIVED_TO_HUNDRED)
                .toList();
        if (derivedInputs.size() > 1) {
            throw new IllegalArgumentException("ad 100으로 도출하는 처방 원료는 한 개만 허용됩니다.");
        }
        if (derivedInputs.isEmpty()) {
            return;
        }

        RawMaterialInput derivedInput = derivedInputs.getFirst();
        FormulaAmount derivedAmount = derivedInput.formulaAmount();
        if (!(derivedAmount.targetTotalMassPercent() instanceof ValueOrMissing.Present<MassPercent> target)) {
            throw new IllegalArgumentException("ad 100 도출에는 목표 합계가 필요합니다.");
        }
        BigDecimal publishedTotal = inputs.stream()
                .filter(input -> input != derivedInput)
                .map(input -> input.formulaAmount().normalizedMassPercent().value())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expectedDerived = target.value().value().subtract(publishedTotal);
        if (expectedDerived.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("공개된 투입량 합계가 ad 100 목표를 초과합니다.");
        }
        if (derivedAmount.normalizedMassPercent().value().compareTo(expectedDerived) != 0) {
            throw new IllegalArgumentException("ad 100에서 도출한 투입량이 나머지 공개 투입량과 일치하지 않습니다.");
        }
    }

    private static BigDecimal requireNonNegative(BigDecimal value, String name) {
        BigDecimal present = requireValue(value, name);
        if (present.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(name + "은 음수일 수 없습니다.");
        }
        return present;
    }

    private static BigDecimal requireValue(BigDecimal value, String name) {
        if (value == null) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
        return value;
    }

    private static BigDecimal canonical(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
