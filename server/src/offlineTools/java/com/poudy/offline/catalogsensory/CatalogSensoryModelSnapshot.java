package com.poudy.offline.catalogsensory;

import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.InputFile;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

public record CatalogSensoryModelSnapshot(
        String schemaVersion,
        String toolVersion,
        SensoryModelVersion modelVersion,
        List<InputFile> inputs,
        List<ProductInference> products) {

    public static final String SCHEMA_VERSION = "catalog-sensory-model-snapshot-v1";
    public static final String TOOL_VERSION = "catalog-sensory-model-snapshot-tool-v1";

    public CatalogSensoryModelSnapshot {
        if (!SCHEMA_VERSION.equals(schemaVersion)) {
            throw new IllegalArgumentException("지원하지 않는 감각 모델 snapshot schema입니다: " + schemaVersion);
        }
        if (!TOOL_VERSION.equals(toolVersion)) {
            throw new IllegalArgumentException("지원하지 않는 감각 모델 snapshot 도구 버전입니다: " + toolVersion);
        }
        Objects.requireNonNull(modelVersion, "감각 모델 snapshot에는 모델 버전이 필요합니다.");
        inputs = List.copyOf(Objects.requireNonNull(inputs, "감각 모델 snapshot에는 입력 식별자가 필요합니다."));
        products = List.copyOf(Objects.requireNonNull(products, "감각 모델 snapshot에는 제품 결과가 필요합니다."));
        if (inputs.isEmpty()) {
            throw new IllegalArgumentException("감각 모델 snapshot 입력은 비어 있을 수 없습니다.");
        }
        if (products.isEmpty()) {
            throw new IllegalArgumentException("감각 모델 snapshot 제품 결과는 비어 있을 수 없습니다.");
        }

        long previousProductId = 0;
        for (ProductInference product : products) {
            Objects.requireNonNull(product, "감각 모델 snapshot 제품 결과는 null일 수 없습니다.");
            if (product.productId() <= previousProductId) {
                throw new IllegalArgumentException("감각 모델 snapshot 제품 ID는 중복 없이 오름차순이어야 합니다.");
            }
            previousProductId = product.productId();
        }
    }

    public record ProductInference(
            long productId,
            long categoryId,
            int moistureLevel,
            int oilLevel,
            BigDecimal confidence) {

        public ProductInference {
            if (productId <= 0) {
                throw new IllegalArgumentException("감각 모델 snapshot 제품 ID는 양수여야 합니다.");
            }
            if (categoryId <= 0) {
                throw new IllegalArgumentException("감각 모델 snapshot category ID는 양수여야 합니다.");
            }
            if (moistureLevel < 0 || moistureLevel > 3) {
                throw new IllegalArgumentException("감각 모델 snapshot 수분감은 0부터 3이어야 합니다.");
            }
            if (oilLevel < 0 || oilLevel > 3) {
                throw new IllegalArgumentException("감각 모델 snapshot 유분감은 0부터 3이어야 합니다.");
            }
            Objects.requireNonNull(confidence, "감각 모델 snapshot confidence가 필요합니다.");
            if (confidence.compareTo(BigDecimal.ZERO) < 0 || confidence.compareTo(BigDecimal.ONE) > 0) {
                throw new IllegalArgumentException("감각 모델 snapshot confidence는 0부터 1이어야 합니다.");
            }
            confidence = confidence.signum() == 0 ? BigDecimal.ZERO : confidence.stripTrailingZeros();
        }
    }
}
