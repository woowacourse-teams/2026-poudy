package com.poudy.offline.sensorysource;

import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import java.util.HashSet;
import java.util.List;

public record CanonicalUsageFormMapping(
        ValueOrMissing<String> observedExpression,
        ValueOrMissing<StableId> canonicalUsageFormId,
        StableId mappingRuleId,
        String mappingVersion,
        CanonicalMappingResolution resolution,
        List<StableId> candidateUsageFormIds) {

    public CanonicalUsageFormMapping {
        if (observedExpression == null) {
            throw new IllegalArgumentException("사용 형태 원문 표현 또는 결측 이유가 필요합니다.");
        }
        if (canonicalUsageFormId == null) {
            throw new IllegalArgumentException("canonical 사용 형태 ID 또는 결측 이유가 필요합니다.");
        }
        if (mappingRuleId == null) {
            throw new IllegalArgumentException("사용 형태 mapping 규칙 식별자가 필요합니다.");
        }
        if (mappingVersion == null || mappingVersion.isBlank()) {
            throw new IllegalArgumentException("사용 형태 mapping 버전이 필요합니다.");
        }
        if (resolution == null) {
            throw new IllegalArgumentException("사용 형태 mapping 해석 상태가 필요합니다.");
        }
        if (candidateUsageFormIds == null
                || candidateUsageFormIds.stream().anyMatch(candidate -> candidate == null)) {
            throw new IllegalArgumentException("사용 형태 후보 ID 목록은 null일 수 없습니다.");
        }

        if (new HashSet<>(candidateUsageFormIds).size() != candidateUsageFormIds.size()) {
            throw new IllegalArgumentException("사용 형태 후보 ID는 중복될 수 없습니다.");
        }
        candidateUsageFormIds = candidateUsageFormIds.stream()
                .sorted((first, second) -> first.value().compareTo(second.value()))
                .toList();
        validateResolution(
                observedExpression,
                canonicalUsageFormId,
                resolution,
                candidateUsageFormIds);
    }

    private static void validateResolution(
            ValueOrMissing<String> observedExpression,
            ValueOrMissing<StableId> canonicalUsageFormId,
            CanonicalMappingResolution resolution,
            List<StableId> candidates) {
        switch (resolution) {
            case EXACT, REVIEWED -> validateResolved(
                    observedExpression,
                    canonicalUsageFormId,
                    candidates);
            case UNRESOLVED -> validateUnresolved(canonicalUsageFormId, candidates);
            case AMBIGUOUS -> validateAmbiguous(canonicalUsageFormId, candidates);
        }
    }

    private static void validateResolved(
            ValueOrMissing<String> observedExpression,
            ValueOrMissing<StableId> canonicalUsageFormId,
            List<StableId> candidates) {
        if (!(observedExpression instanceof ValueOrMissing.Present<String>)) {
            throw new IllegalArgumentException("확정된 사용 형태 mapping에는 원문 표현이 필요합니다.");
        }
        if (!(canonicalUsageFormId instanceof ValueOrMissing.Present<StableId>)) {
            throw new IllegalArgumentException("확정된 사용 형태 mapping에는 canonical ID가 필요합니다.");
        }
        if (!candidates.isEmpty()) {
            throw new IllegalArgumentException("확정된 사용 형태 mapping에는 후보 ID를 둘 수 없습니다.");
        }
    }

    private static void validateUnresolved(
            ValueOrMissing<StableId> canonicalUsageFormId,
            List<StableId> candidates) {
        if (!(canonicalUsageFormId instanceof ValueOrMissing.Missing<StableId>)
                || !candidates.isEmpty()) {
            throw new IllegalArgumentException("미해결 사용 형태 mapping에는 canonical ID나 후보 ID가 없어야 합니다.");
        }
    }

    private static void validateAmbiguous(
            ValueOrMissing<StableId> canonicalUsageFormId,
            List<StableId> candidates) {
        if (!(canonicalUsageFormId instanceof ValueOrMissing.Missing<StableId>)
                || candidates.size() < 2) {
            throw new IllegalArgumentException("모호한 사용 형태 mapping에는 canonical ID가 없고 후보 ID가 둘 이상이어야 합니다.");
        }
    }
}
