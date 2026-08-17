package com.poudy.product.domain.sensory;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;

public record FormulaArchetypeProbabilities(Map<FormulaArchetype, BigDecimal> values) {

    public FormulaArchetypeProbabilities {
        if (values == null || !values.keySet().equals(EnumSet.allOf(FormulaArchetype.class))) {
            throw new IllegalArgumentException("모든 제형 유형의 확률이 필요합니다.");
        }

        EnumMap<FormulaArchetype, BigDecimal> normalized = new EnumMap<>(FormulaArchetype.class);
        BigDecimal total = BigDecimal.ZERO;
        for (FormulaArchetype archetype : FormulaArchetype.values()) {
            BigDecimal probability = values.get(archetype);
            if (probability == null
                    || probability.compareTo(BigDecimal.ZERO) < 0
                    || probability.compareTo(BigDecimal.ONE) > 0) {
                throw new IllegalArgumentException("제형 유형 확률은 0부터 1까지여야 합니다.");
            }

            BigDecimal canonical = probability.stripTrailingZeros();
            normalized.put(archetype, canonical);
            total = total.add(canonical);
        }

        if (total.compareTo(BigDecimal.ONE) != 0) {
            throw new IllegalArgumentException("제형 유형 확률 합계는 1이어야 합니다.");
        }

        values = Collections.unmodifiableMap(normalized);
    }

    public BigDecimal probabilityOf(FormulaArchetype archetype) {
        return values.get(Objects.requireNonNull(archetype, "제형 유형이 필요합니다."));
    }
}
