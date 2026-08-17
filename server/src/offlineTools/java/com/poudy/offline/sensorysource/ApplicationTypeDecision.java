package com.poudy.offline.sensorysource;

import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import com.poudy.product.domain.ApplicationType;

public record ApplicationTypeDecision(
        ApplicationType value,
        ValueOrMissing<String> evidenceLocation,
        StableId decisionRuleId,
        String decisionRuleVersion,
        Resolution resolution,
        ValueOrMissing<String> limitationNote) {

    public ApplicationTypeDecision {
        if (value == null) {
            throw new IllegalArgumentException("application type 판정값이 필요합니다.");
        }
        if (evidenceLocation == null) {
            throw new IllegalArgumentException("application type 판정 근거 위치 또는 결측 이유가 필요합니다.");
        }
        if (decisionRuleId == null) {
            throw new IllegalArgumentException("application type 판정 규칙 식별자가 필요합니다.");
        }
        decisionRuleVersion = requireNonBlank(decisionRuleVersion);
        if (resolution == null) {
            throw new IllegalArgumentException("application type 판정 해석 상태가 필요합니다.");
        }
        if (limitationNote == null) {
            throw new IllegalArgumentException("application type 판정 한계 또는 결측 이유가 필요합니다.");
        }

        validateDecision(value, evidenceLocation, resolution, limitationNote);
    }

    private static String requireNonBlank(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("application type 판정 규칙 버전이 필요합니다.");
        }

        return value;
    }

    private static void validateDecision(
            ApplicationType value,
            ValueOrMissing<String> evidenceLocation,
            Resolution resolution,
            ValueOrMissing<String> limitationNote) {
        if (value == ApplicationType.UNKNOWN) {
            if (resolution != Resolution.UNRESOLVED && resolution != Resolution.CONFLICTING) {
                throw new IllegalArgumentException("UNKNOWN 판정은 미해결 또는 상충 상태여야 합니다.");
            }
            if (!(limitationNote instanceof ValueOrMissing.Present<String>)) {
                throw new IllegalArgumentException("UNKNOWN 판정에는 미확정 이유가 필요합니다.");
            }
            if (resolution == Resolution.CONFLICTING
                    && !(evidenceLocation instanceof ValueOrMissing.Present<String>)) {
                throw new IllegalArgumentException("상충 판정에는 근거 위치가 필요합니다.");
            }
            return;
        }

        if (!(evidenceLocation instanceof ValueOrMissing.Present<String>)) {
            throw new IllegalArgumentException("leave-on 또는 rinse-off 판정에는 공식 근거 위치가 필요합니다.");
        }
        if (resolution != Resolution.EXACT && resolution != Resolution.REVIEWED) {
            throw new IllegalArgumentException("leave-on 또는 rinse-off 판정은 정확 일치 또는 검수 완료 상태여야 합니다.");
        }
    }

    public enum Resolution {
        EXACT,
        REVIEWED,
        UNRESOLVED,
        CONFLICTING
    }
}
