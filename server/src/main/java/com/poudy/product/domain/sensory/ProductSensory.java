package com.poudy.product.domain.sensory;

public record ProductSensory(
        MoistureLevel moisture,
        OilLevel oil,
        SensoryConfidence confidence,
        SensoryModelVersion modelVersion) {

    public ProductSensory {
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
    }
}
