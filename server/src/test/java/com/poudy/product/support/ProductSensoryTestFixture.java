package com.poudy.product.support;

import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.domain.sensory.ProductSensory;

public final class ProductSensoryTestFixture {

    private ProductSensoryTestFixture() {
    }

    public static ProductSensory sensory(int moistureLevel, int oilLevel) {
        return new ProductSensory(new MoistureLevel(moistureLevel), new OilLevel(oilLevel));
    }
}
