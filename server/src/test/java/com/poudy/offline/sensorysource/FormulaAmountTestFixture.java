package com.poudy.offline.sensorysource;

import com.poudy.offline.source.StableId;

final class FormulaAmountTestFixture {

    private static final StableId EXACT_RULE = StableId.namespaced(
            "formula-amount-rule",
            "published-decimal");
    private static final StableId AD_HUNDRED_RULE = StableId.namespaced(
            "formula-amount-rule",
            "ad-hundred-remainder");
    private static final String VERSION = "formula-amount-normalization-v1";

    private FormulaAmountTestFixture() {
    }

    static FormulaAmount exact(String value) {
        return FormulaAmount.exactPublished(
                value,
                MassPercent.parse(value),
                EXACT_RULE,
                VERSION);
    }

    static FormulaAmount derivedToHundred(String expression, String normalizedValue) {
        return FormulaAmount.derivedToHundred(
                expression,
                MassPercent.parse(normalizedValue),
                AD_HUNDRED_RULE,
                VERSION);
    }
}
