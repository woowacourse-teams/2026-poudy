package com.poudy.product.support;

import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.product.domain.sensory.SensoryConfidence;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import java.math.BigDecimal;

public final class ProductSensoryTestFixture {

    private static final SensoryModelVersion TEST_VERSION = new SensoryModelVersion(
            "test-ingredient-profile",
            "test-category-prior",
            "test-level-model");

    private ProductSensoryTestFixture() {
    }

    public static ProductSensory sensory(int moistureLevel, int oilLevel) {
        return new ProductSensory(
                new MoistureLevel(moistureLevel),
                new OilLevel(oilLevel),
                new SensoryConfidence(new BigDecimal("0.5")),
                TEST_VERSION);
    }
}
