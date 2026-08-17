package com.poudy.offline.sensorysource;

import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import com.poudy.product.domain.sensory.FormulaArchetype;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;

public record CanonicalFormulationMapping(
        ValueOrMissing<String> observedExpression,
        FormulaArchetype formulaArchetype,
        StableId mappingRuleId,
        String mappingVersion,
        CanonicalMappingResolution resolution,
        List<FormulaArchetype> candidateArchetypes) {

    public CanonicalFormulationMapping {
        if (observedExpression == null) {
            throw new IllegalArgumentException("제형 원문 표현 또는 결측 이유가 필요합니다.");
        }
        if (formulaArchetype == null) {
            throw new IllegalArgumentException("canonical 제형 유형이 필요합니다.");
        }
        if (mappingRuleId == null) {
            throw new IllegalArgumentException("제형 mapping 규칙 식별자가 필요합니다.");
        }
        if (mappingVersion == null || mappingVersion.isBlank()) {
            throw new IllegalArgumentException("제형 mapping 버전이 필요합니다.");
        }
        if (resolution == null) {
            throw new IllegalArgumentException("제형 mapping 해석 상태가 필요합니다.");
        }
        if (candidateArchetypes == null
                || candidateArchetypes.stream().anyMatch(candidate -> candidate == null)) {
            throw new IllegalArgumentException("제형 후보 목록은 null일 수 없습니다.");
        }

        rejectInvalidCandidates(candidateArchetypes);
        candidateArchetypes = candidateArchetypes.stream()
                .sorted(Comparator.comparingInt(FormulaArchetype::ordinal))
                .toList();
        validateResolution(
                observedExpression,
                formulaArchetype,
                resolution,
                candidateArchetypes);
    }

    private static void rejectInvalidCandidates(List<FormulaArchetype> candidates) {
        if (candidates.contains(FormulaArchetype.UNKNOWN)) {
            throw new IllegalArgumentException("제형 후보에는 UNKNOWN을 넣을 수 없습니다.");
        }
        EnumSet<FormulaArchetype> uniqueCandidates = EnumSet.noneOf(FormulaArchetype.class);
        uniqueCandidates.addAll(candidates);
        if (uniqueCandidates.size() != candidates.size()) {
            throw new IllegalArgumentException("제형 후보는 중복될 수 없습니다.");
        }
    }

    private static void validateResolution(
            ValueOrMissing<String> observedExpression,
            FormulaArchetype formulaArchetype,
            CanonicalMappingResolution resolution,
            List<FormulaArchetype> candidates) {
        switch (resolution) {
            case EXACT, REVIEWED -> validateResolved(
                    observedExpression,
                    formulaArchetype,
                    candidates);
            case UNRESOLVED -> validateUnresolved(formulaArchetype, candidates);
            case AMBIGUOUS -> validateAmbiguous(formulaArchetype, candidates);
        }
    }

    private static void validateResolved(
            ValueOrMissing<String> observedExpression,
            FormulaArchetype formulaArchetype,
            List<FormulaArchetype> candidates) {
        if (!(observedExpression instanceof ValueOrMissing.Present<String>)) {
            throw new IllegalArgumentException("확정된 제형 mapping에는 원문 표현이 필요합니다.");
        }
        if (formulaArchetype == FormulaArchetype.UNKNOWN) {
            throw new IllegalArgumentException("확정된 제형 mapping은 UNKNOWN일 수 없습니다.");
        }
        if (!candidates.isEmpty()) {
            throw new IllegalArgumentException("확정된 제형 mapping에는 후보 목록을 둘 수 없습니다.");
        }
    }

    private static void validateUnresolved(
            FormulaArchetype formulaArchetype,
            List<FormulaArchetype> candidates) {
        if (formulaArchetype != FormulaArchetype.UNKNOWN || !candidates.isEmpty()) {
            throw new IllegalArgumentException("미해결 제형 mapping은 UNKNOWN이고 후보가 없어야 합니다.");
        }
    }

    private static void validateAmbiguous(
            FormulaArchetype formulaArchetype,
            List<FormulaArchetype> candidates) {
        if (formulaArchetype != FormulaArchetype.UNKNOWN || candidates.size() < 2) {
            throw new IllegalArgumentException("모호한 제형 mapping은 UNKNOWN이고 서로 다른 후보가 둘 이상이어야 합니다.");
        }
    }
}
