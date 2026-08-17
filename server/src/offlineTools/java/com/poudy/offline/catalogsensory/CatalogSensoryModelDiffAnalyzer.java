package com.poudy.offline.catalogsensory;

import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.AxisChanges;
import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.ConfidenceChanges;
import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.DeltaCount;
import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.ProductChange;
import com.poudy.offline.catalogsensory.CatalogSensoryModelSnapshot.ProductInference;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

public final class CatalogSensoryModelDiffAnalyzer {

    public CatalogSensoryModelDiff compare(
            CatalogSensoryModelSnapshot baseline,
            CatalogSensoryModelSnapshot candidate) {
        Objects.requireNonNull(baseline, "비교할 baseline snapshot이 필요합니다.");
        Objects.requireNonNull(candidate, "비교할 candidate snapshot이 필요합니다.");
        if (!baseline.inputs().equals(candidate.inputs())) {
            throw new IllegalArgumentException("동일한 catalog 입력 해시를 가진 snapshot끼리만 모델을 비교할 수 있습니다.");
        }

        Map<Long, ProductInference> baselineProducts = byProductId(baseline.products());
        Map<Long, ProductInference> candidateProducts = byProductId(candidate.products());
        if (!baselineProducts.keySet().equals(candidateProducts.keySet())) {
            throw new IllegalArgumentException("baseline과 candidate의 제품 ID 집합이 다릅니다.");
        }

        AxisAccumulator moisture = new AxisAccumulator();
        AxisAccumulator oil = new AxisAccumulator();
        ConfidenceAccumulator confidence = new ConfidenceAccumulator();
        List<ProductChange> changes = new ArrayList<>();
        for (Map.Entry<Long, ProductInference> entry : baselineProducts.entrySet()) {
            ProductInference before = entry.getValue();
            ProductInference after = candidateProducts.get(entry.getKey());
            if (before.categoryId() != after.categoryId()) {
                throw new IllegalArgumentException("동일 제품의 category가 달라 모델 변경만 비교할 수 없습니다: " + entry.getKey());
            }

            int moistureDelta = after.moistureLevel() - before.moistureLevel();
            int oilDelta = after.oilLevel() - before.oilLevel();
            int confidenceComparison = after.confidence().compareTo(before.confidence());
            moisture.accept(moistureDelta);
            oil.accept(oilDelta);
            confidence.accept(before.confidence(), after.confidence());
            if (moistureDelta != 0 || oilDelta != 0 || confidenceComparison != 0) {
                changes.add(
                        new ProductChange(
                                before.productId(),
                                before.categoryId(),
                                before.moistureLevel(),
                                after.moistureLevel(),
                                before.oilLevel(),
                                after.oilLevel(),
                                before.confidence(),
                                after.confidence()));
            }
        }
        if (!changes.isEmpty() && baseline.modelVersion().equals(candidate.modelVersion())) {
            throw new IllegalArgumentException("제품 추론 결과가 바뀌면 감각 모델 구성 버전도 바뀌어야 합니다.");
        }

        return new CatalogSensoryModelDiff(
                CatalogSensoryModelDiff.SCHEMA_VERSION,
                CatalogSensoryModelDiff.TOOL_VERSION,
                baseline.inputs(),
                baseline.modelVersion(),
                candidate.modelVersion(),
                baselineProducts.size(),
                moisture.toReport(),
                oil.toReport(),
                confidence.toReport(),
                List.copyOf(changes));
    }

    private static Map<Long, ProductInference> byProductId(List<ProductInference> products) {
        Map<Long, ProductInference> values = new TreeMap<>();
        for (ProductInference product : products) {
            ProductInference previous = values.putIfAbsent(product.productId(), product);
            if (previous != null) {
                throw new IllegalArgumentException("snapshot 제품 ID가 중복됩니다: " + product.productId());
            }
        }
        return values;
    }

    private static final class AxisAccumulator {

        private static final int MINIMUM_DELTA = -3;
        private static final int MAXIMUM_DELTA = 3;

        private final int[] deltas = new int[MAXIMUM_DELTA - MINIMUM_DELTA + 1];
        private int unchanged;
        private int increased;
        private int decreased;
        private int changedByAtLeastTwo;

        private void accept(int delta) {
            if (delta < MINIMUM_DELTA || delta > MAXIMUM_DELTA) {
                throw new IllegalArgumentException("감각 단계 변화는 -3부터 3이어야 합니다: " + delta);
            }
            deltas[delta - MINIMUM_DELTA]++;
            if (delta == 0) {
                unchanged++;
            } else if (delta > 0) {
                increased++;
            } else {
                decreased++;
            }
            if (Math.abs(delta) >= 2) {
                changedByAtLeastTwo++;
            }
        }

        private AxisChanges toReport() {
            List<DeltaCount> counts = new ArrayList<>();
            for (int delta = MINIMUM_DELTA; delta <= MAXIMUM_DELTA; delta++) {
                counts.add(new DeltaCount(delta, deltas[delta - MINIMUM_DELTA]));
            }
            return new AxisChanges(
                    unchanged,
                    increased,
                    decreased,
                    changedByAtLeastTwo,
                    List.copyOf(counts));
        }
    }

    private static final class ConfidenceAccumulator {

        private BigDecimal deltaSum = BigDecimal.ZERO;
        private BigDecimal maximumAbsoluteDelta = BigDecimal.ZERO;
        private int samples;
        private int unchanged;
        private int increased;
        private int decreased;

        private void accept(BigDecimal before, BigDecimal after) {
            BigDecimal delta = after.subtract(before);
            deltaSum = deltaSum.add(delta);
            maximumAbsoluteDelta = maximumAbsoluteDelta.max(delta.abs());
            samples++;
            int comparison = delta.compareTo(BigDecimal.ZERO);
            if (comparison == 0) {
                unchanged++;
            } else if (comparison > 0) {
                increased++;
            } else {
                decreased++;
            }
        }

        private ConfidenceChanges toReport() {
            BigDecimal meanDelta = samples == 0
                    ? BigDecimal.ZERO.setScale(4)
                    : deltaSum.divide(BigDecimal.valueOf(samples), 4, RoundingMode.HALF_UP);
            return new ConfidenceChanges(
                    unchanged,
                    increased,
                    decreased,
                    meanDelta,
                    normalized(maximumAbsoluteDelta));
        }

        private static BigDecimal normalized(BigDecimal value) {
            return value.signum() == 0 ? BigDecimal.ZERO : value.stripTrailingZeros();
        }
    }
}
