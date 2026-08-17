package com.poudy.offline.sensorysource;

import com.poudy.offline.source.StableId;

public record RawMaterialInput(
        StableId rawMaterialId,
        String rawMaterialNameAsPublished,
        MassPercent formulaAmount,
        RawMaterialComposition composition) {

    public RawMaterialInput {
        if (rawMaterialId == null) {
            throw new IllegalArgumentException("원료 식별자가 필요합니다.");
        }
        if (rawMaterialNameAsPublished == null || rawMaterialNameAsPublished.isBlank()) {
            throw new IllegalArgumentException("원료 원문 이름이 필요합니다.");
        }
        if (formulaAmount == null) {
            throw new IllegalArgumentException("원료 처방 투입량이 필요합니다.");
        }
        if (composition == null) {
            throw new IllegalArgumentException("원료 구성 정보가 필요합니다.");
        }
    }
}
