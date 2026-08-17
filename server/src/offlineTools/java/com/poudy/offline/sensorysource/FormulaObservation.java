package com.poudy.offline.sensorysource;

import com.poudy.offline.source.EvidenceAssessment;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValidationStatus;
import com.poudy.offline.source.ValueOrMissing;
import com.poudy.product.domain.ApplicationType;
import java.util.List;

public record FormulaObservation(
        StableId formulaObservationId,
        StableId formulaRevisionId,
        StableId sourceMetadataId,
        EvidenceAssessment evidenceAssessment,
        CanonicalCategoryMapping canonicalCategoryMapping,
        StableId usageVariant,
        ApplicationTypeDecision applicationTypeDecision,
        ValueOrMissing<String> usageInstructionText,
        CanonicalUsageFormMapping canonicalUsageFormMapping,
        CanonicalFormulationMapping canonicalFormulationMapping,
        List<RawMaterialInput> orderedRawMaterialInputs,
        FormulaMassBalanceAssessment massBalanceAssessment,
        ValueOrMissing<String> manufacturingProcess,
        List<PhysicalPropertyMeasurement> physicalPropertyMeasurements,
        List<String> claimedSensoryTerms,
        ValidationStatus validationStatus) {

    public FormulaObservation {
        requireValue(formulaObservationId, "처방 observation 식별자");
        requireValue(formulaRevisionId, "처방 revision 식별자");
        requireValue(sourceMetadataId, "원천 metadata 식별자");
        requireValue(evidenceAssessment, "근거 평가");
        requireValue(canonicalCategoryMapping, "canonical category mapping");
        requireValue(usageVariant, "사용 절차 variant 식별자");
        requireValue(applicationTypeDecision, "application type 판정");
        requireValue(usageInstructionText, "사용 절차 원문 또는 결측 이유");
        requireValue(canonicalUsageFormMapping, "canonical 사용 형태 mapping");
        requireValue(canonicalFormulationMapping, "canonical 제형 mapping");
        requireValue(massBalanceAssessment, "처방 질량 보존 평가");
        requireValue(manufacturingProcess, "제조 공정 원문 또는 결측 이유");
        requireValue(validationStatus, "처방 observation 검증 상태");

        orderedRawMaterialInputs = immutableNonEmpty(
                orderedRawMaterialInputs,
                "처방 원료 입력");
        physicalPropertyMeasurements = immutable(
                physicalPropertyMeasurements,
                "측정 물성");
        claimedSensoryTerms = immutableNonBlankStrings(
                claimedSensoryTerms,
                "원문 감각 표현");

        FormulaMassBalanceAssessment computedMassBalance = FormulaMassBalanceAssessment
                .assess(orderedRawMaterialInputs);
        if (!massBalanceAssessment.equals(computedMassBalance)) {
            throw new IllegalArgumentException("처방 원료 입력과 질량 보존 평가가 일치하지 않습니다.");
        }

        rejectAcceptedObservationWithQuarantineReason(
                applicationTypeDecision,
                orderedRawMaterialInputs,
                massBalanceAssessment,
                validationStatus);
    }

    private static void rejectAcceptedObservationWithQuarantineReason(
            ApplicationTypeDecision applicationTypeDecision,
            List<RawMaterialInput> inputs,
            FormulaMassBalanceAssessment massBalance,
            ValidationStatus validationStatus) {
        if (validationStatus != ValidationStatus.ACCEPTED) {
            return;
        }
        if (applicationTypeDecision.value() == ApplicationType.UNKNOWN) {
            throw new IllegalArgumentException("application type이 미확정인 처방은 ACCEPTED일 수 없습니다.");
        }
        if (massBalance.validationStatus() != ValidationStatus.ACCEPTED) {
            throw new IllegalArgumentException("질량 합계가 100이 아닌 처방은 ACCEPTED일 수 없습니다.");
        }
        if (hasUnresolvedIngredientIdentity(inputs)) {
            throw new IllegalArgumentException("성분 identity가 미확정인 처방은 ACCEPTED일 수 없습니다.");
        }
    }

    private static boolean hasUnresolvedIngredientIdentity(List<RawMaterialInput> inputs) {
        return inputs.stream().anyMatch(input -> switch (input.composition()) {
            case RawMaterialComposition.KnownComposition known -> known.components().stream()
                    .anyMatch(component -> !isResolved(component.ingredientResolution()));
            case RawMaterialComposition.UnquantifiedComposition unquantified ->
                unquantified.components().stream()
                        .anyMatch(component -> !isResolved(component.ingredientResolution()));
        });
    }

    private static boolean isResolved(IngredientResolution resolution) {
        return resolution instanceof IngredientResolution.Resolved;
    }

    private static <T> void requireValue(T value, String name) {
        if (value == null) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
    }

    private static <T> List<T> immutableNonEmpty(List<T> values, String name) {
        List<T> copy = immutable(values, name);
        if (copy.isEmpty()) {
            throw new IllegalArgumentException(name + "은 한 개 이상이어야 합니다.");
        }
        return copy;
    }

    private static <T> List<T> immutable(List<T> values, String name) {
        if (values == null || values.stream().anyMatch(value -> value == null)) {
            throw new IllegalArgumentException(name + " 목록은 null일 수 없습니다.");
        }
        return List.copyOf(values);
    }

    private static List<String> immutableNonBlankStrings(List<String> values, String name) {
        List<String> copy = immutable(values, name);
        if (copy.stream().anyMatch(String::isBlank)) {
            throw new IllegalArgumentException(name + "은 빈 문자열일 수 없습니다.");
        }
        return copy;
    }
}
