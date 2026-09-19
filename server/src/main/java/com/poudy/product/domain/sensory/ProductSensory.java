package com.poudy.product.domain.sensory;

import java.util.Objects;

public final class ProductSensory {

    private final MoistureLevel moisture;
    private final OilLevel oil;

    public ProductSensory(MoistureLevel moisture, OilLevel oil) {
        if (moisture == null) {
            throw new IllegalArgumentException("제품 수분감 단계가 필요합니다.");
        }
        if (oil == null) {
            throw new IllegalArgumentException("제품 유분감 단계가 필요합니다.");
        }

        this.moisture = moisture;
        this.oil = oil;
    }

    public MoistureLevel moisture() {
        return moisture;
    }

    public OilLevel oil() {
        return oil;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ProductSensory that)) {
            return false;
        }
        return moisture.equals(that.moisture) && oil.equals(that.oil);
    }

    @Override
    public int hashCode() {
        return Objects.hash(moisture, oil);
    }
}
