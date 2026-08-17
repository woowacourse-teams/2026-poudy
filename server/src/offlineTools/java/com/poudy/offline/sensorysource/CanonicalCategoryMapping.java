package com.poudy.offline.sensorysource;

import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;

public record CanonicalCategoryMapping(
        String observedValue,
        ValueOrMissing<Long> canonicalCategoryId,
        StableId mappingRuleId,
        String mappingVersion,
        CanonicalMappingResolution resolution) {

    public CanonicalCategoryMapping {
        if (observedValue == null || observedValue.isBlank()) {
            throw new IllegalArgumentException("관측한 category 값이 필요합니다.");
        }
        if (canonicalCategoryId == null) {
            throw new IllegalArgumentException("canonical category ID 또는 결측 이유가 필요합니다.");
        }
        validatePositiveCategoryId(canonicalCategoryId);
        if (mappingRuleId == null) {
            throw new IllegalArgumentException("category mapping 규칙 식별자가 필요합니다.");
        }
        if (mappingVersion == null || mappingVersion.isBlank()) {
            throw new IllegalArgumentException("category mapping 버전이 필요합니다.");
        }
        if (resolution == null) {
            throw new IllegalArgumentException("category mapping 해석 상태가 필요합니다.");
        }

        validateResolution(canonicalCategoryId, resolution);
    }

    private static void validatePositiveCategoryId(ValueOrMissing<Long> canonicalCategoryId) {
        if (canonicalCategoryId instanceof ValueOrMissing.Present<Long> present
                && present.value() <= 0) {
            throw new IllegalArgumentException("canonical category ID는 양수여야 합니다.");
        }
    }

    private static void validateResolution(
            ValueOrMissing<Long> canonicalCategoryId,
            CanonicalMappingResolution resolution) {
        boolean resolved = canonicalCategoryId instanceof ValueOrMissing.Present<Long>;
        switch (resolution) {
            case EXACT, REVIEWED -> {
                if (!resolved) {
                    throw new IllegalArgumentException("확정된 category mapping에는 canonical ID가 필요합니다.");
                }
            }
            case UNRESOLVED, AMBIGUOUS -> {
                if (resolved) {
                    throw new IllegalArgumentException("미확정 category mapping에는 canonical ID를 둘 수 없습니다.");
                }
            }
        }
    }
}
