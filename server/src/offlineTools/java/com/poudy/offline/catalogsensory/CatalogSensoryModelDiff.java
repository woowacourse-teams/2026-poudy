package com.poudy.offline.catalogsensory;

import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.InputFile;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import java.math.BigDecimal;
import java.util.List;

public record CatalogSensoryModelDiff(
        String schemaVersion,
        String toolVersion,
        List<InputFile> inputs,
        SensoryModelVersion baselineModelVersion,
        SensoryModelVersion candidateModelVersion,
        int comparedProducts,
        AxisChanges moisture,
        AxisChanges oil,
        ConfidenceChanges confidence,
        List<ProductChange> changedProducts) {

    public static final String SCHEMA_VERSION = "catalog-sensory-model-diff-v1";
    public static final String TOOL_VERSION = "catalog-sensory-model-diff-tool-v1";

    public record AxisChanges(
            int unchanged,
            int increased,
            int decreased,
            int changedByAtLeastTwo,
            List<DeltaCount> deltas) {
    }

    public record DeltaCount(int delta, int products) {
    }

    public record ConfidenceChanges(
            int unchanged,
            int increased,
            int decreased,
            BigDecimal meanDelta,
            BigDecimal maximumAbsoluteDelta) {
    }

    public record ProductChange(
            long productId,
            long categoryId,
            int moistureBefore,
            int moistureAfter,
            int oilBefore,
            int oilAfter,
            BigDecimal confidenceBefore,
            BigDecimal confidenceAfter) {

        public int moistureDelta() {
            return moistureAfter - moistureBefore;
        }

        public int oilDelta() {
            return oilAfter - oilBefore;
        }

        public BigDecimal confidenceDelta() {
            BigDecimal difference = confidenceAfter.subtract(confidenceBefore);
            return difference.signum() == 0 ? BigDecimal.ZERO : difference.stripTrailingZeros();
        }
    }
}
