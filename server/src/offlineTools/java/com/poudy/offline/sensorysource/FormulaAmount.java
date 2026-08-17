package com.poudy.offline.sensorysource;

import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import java.math.BigDecimal;

public record FormulaAmount(
        String expressionAsPublished,
        MassPercent normalizedMassPercent,
        Resolution resolution,
        StableId normalizationRuleId,
        String normalizationRuleVersion,
        ValueOrMissing<MassPercent> targetTotalMassPercent) {

    private static final MassPercent HUNDRED_PERCENT = MassPercent.parse("100");

    public FormulaAmount {
        if (expressionAsPublished == null || expressionAsPublished.isBlank()) {
            throw new IllegalArgumentException("원문 처방 투입량 표현이 필요합니다.");
        }
        if (normalizedMassPercent == null) {
            throw new IllegalArgumentException("정규화한 처방 질량 백분율이 필요합니다.");
        }
        if (resolution == null) {
            throw new IllegalArgumentException("처방 투입량 해석 상태가 필요합니다.");
        }
        if (normalizationRuleId == null) {
            throw new IllegalArgumentException("처방 투입량 정규화 규칙 식별자가 필요합니다.");
        }
        if (normalizationRuleVersion == null || normalizationRuleVersion.isBlank()) {
            throw new IllegalArgumentException("처방 투입량 정규화 규칙 버전이 필요합니다.");
        }
        if (targetTotalMassPercent == null) {
            throw new IllegalArgumentException("목표 합계 또는 해당 없음 이유가 필요합니다.");
        }

        validateResolution(
                expressionAsPublished,
                normalizedMassPercent,
                resolution,
                targetTotalMassPercent);
    }

    public static FormulaAmount exactPublished(
            String expressionAsPublished,
            MassPercent normalizedMassPercent,
            StableId normalizationRuleId,
            String normalizationRuleVersion) {
        return new FormulaAmount(
                expressionAsPublished,
                normalizedMassPercent,
                Resolution.EXACT_PUBLISHED,
                normalizationRuleId,
                normalizationRuleVersion,
                ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));
    }

    public static FormulaAmount derivedToHundred(
            String expressionAsPublished,
            MassPercent normalizedMassPercent,
            StableId normalizationRuleId,
            String normalizationRuleVersion) {
        return new FormulaAmount(
                expressionAsPublished,
                normalizedMassPercent,
                Resolution.DERIVED_TO_HUNDRED,
                normalizationRuleId,
                normalizationRuleVersion,
                ValueOrMissing.present(HUNDRED_PERCENT));
    }

    private static void validateResolution(
            String expressionAsPublished,
            MassPercent normalizedMassPercent,
            Resolution resolution,
            ValueOrMissing<MassPercent> targetTotalMassPercent) {
        switch (resolution) {
            case EXACT_PUBLISHED -> {
                if (!(targetTotalMassPercent instanceof ValueOrMissing.Missing<MassPercent> missing)
                        || missing.reason() != MissingReason.NOT_APPLICABLE) {
                    throw new IllegalArgumentException("직접 공개된 투입량에는 목표 합계를 둘 수 없습니다.");
                }
                validateExactPublishedExpression(expressionAsPublished, normalizedMassPercent);
            }
            case DERIVED_TO_HUNDRED -> {
                if (!(targetTotalMassPercent instanceof ValueOrMissing.Present<MassPercent> present)
                        || !present.value().equals(HUNDRED_PERCENT)) {
                    throw new IllegalArgumentException("ad 100 도출에는 100% 목표 합계가 필요합니다.");
                }
            }
        }
    }

    private static void validateExactPublishedExpression(
            String expressionAsPublished,
            MassPercent normalizedMassPercent) {
        BigDecimal publishedValue;
        try {
            publishedValue = new BigDecimal(expressionAsPublished.strip());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "직접 공개된 투입량은 현재 단순 십진수 표현만 허용합니다.",
                    exception);
        }
        if (publishedValue.compareTo(normalizedMassPercent.value()) != 0) {
            throw new IllegalArgumentException("원문 투입량과 정규화한 질량 백분율이 일치하지 않습니다.");
        }
    }

    public enum Resolution {
        EXACT_PUBLISHED,
        DERIVED_TO_HUNDRED
    }
}
