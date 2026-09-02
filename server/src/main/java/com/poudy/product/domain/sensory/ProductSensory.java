package com.poudy.product.domain.sensory;

import java.util.Objects;

public final class ProductSensory {

    private final MoistureLevel moisture;
    private final OilLevel oil;
    private final SensoryConfidence confidence;
    private final SensoryModelVersion modelVersion;

    public ProductSensory(
        MoistureLevel moisture,
        OilLevel oil,
        SensoryConfidence confidence,
        SensoryModelVersion modelVersion
    ) {
        if (moisture == null) {
            throw new IllegalArgumentException("제품 수분감 단계가 필요합니다.");
        }
        if (oil == null) {
            throw new IllegalArgumentException("제품 유분감 단계가 필요합니다.");
        }
        if (confidence == null) {
            throw new IllegalArgumentException("제품 감각 추론 신뢰도가 필요합니다.");
        }
        if (modelVersion == null) {
            throw new IllegalArgumentException("제품 감각 추론 모델 버전이 필요합니다.");
        }

        this.moisture = moisture;
        this.oil = oil;
        this.confidence = confidence;
        this.modelVersion = modelVersion;
    }

    public MoistureLevel moisture() {
        return moisture;
    }

    public OilLevel oil() {
        return oil;
    }

    public SensoryConfidence confidence() {
        return confidence;
    }

    public SensoryModelVersion modelVersion() {
        return modelVersion;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ProductSensory that)) {
            return false;
        }
        return moisture.equals(that.moisture)
            && oil.equals(that.oil)
            && confidence.equals(that.confidence)
            && modelVersion.equals(that.modelVersion);
    }

    @Override
    public int hashCode() {
        return Objects.hash(moisture, oil, confidence, modelVersion);
    }
}
