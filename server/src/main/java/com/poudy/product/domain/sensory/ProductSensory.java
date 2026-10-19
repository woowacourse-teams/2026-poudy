package com.poudy.product.domain.sensory;

import java.util.List;
import java.util.Objects;

public final class ProductSensory {

    private static final List<String> EXCLUDED_CATEGORIES = List.of("향수", "클렌징");
    private static final ProductSensory UNAVAILABLE = new ProductSensory();

    private final MoistureLevel moisture;
    private final OilLevel oil;

    private ProductSensory() {
        this.moisture = null;
        this.oil = null;
    }

    public static ProductSensory forCategory(String rootCategoryName, double moisture, double oil) {
        if (EXCLUDED_CATEGORIES.contains(rootCategoryName)) {
            return UNAVAILABLE;
        }
        return new ProductSensory(new MoistureLevel(moisture), new OilLevel(oil));
    }

    public static List<String> excludedCategoryNames() {
        return EXCLUDED_CATEGORIES;
    }

    public boolean isAvailable() {
        return moisture != null;
    }

    public Double moistureLevel() {
        if (!isAvailable()) {
            return null;
        }
        return moisture.value();
    }

    public Double oilLevel() {
        if (!isAvailable()) {
            return null;
        }
        return oil.value();
    }

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

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ProductSensory that)) {
            return false;
        }
        return Objects.equals(moisture, that.moisture) && Objects.equals(oil, that.oil);
    }

    @Override
    public int hashCode() {
        return Objects.hash(moisture, oil);
    }
}
