package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 감각 추론 결과")
public class ProductSensoryTest {

    private static final MoistureLevel MOISTURE = new MoistureLevel(3);
    private static final OilLevel OIL = new OilLevel(0);
    private static final SensoryConfidence CONFIDENCE = new SensoryConfidence(new BigDecimal("0.8"));
    private static final SensoryModelVersion MODEL_VERSION = new SensoryModelVersion(
            "ingredient-1",
            "category-1",
            "level-1");

    @Test
    @DisplayName("수분감과 유분감을 서로 독립된 축으로 보관한다")
    public void keepsMoistureAndOilAsIndependentAxes() {
        ProductSensory moistureRich = new ProductSensory(MOISTURE, OIL, CONFIDENCE, MODEL_VERSION);
        ProductSensory oilRich = new ProductSensory(
                new MoistureLevel(0),
                new OilLevel(3),
                CONFIDENCE,
                MODEL_VERSION);

        assertThat(moistureRich.moisture()).isEqualTo(new MoistureLevel(3));
        assertThat(moistureRich.oil()).isEqualTo(new OilLevel(0));
        assertThat(oilRich.moisture()).isEqualTo(new MoistureLevel(0));
        assertThat(oilRich.oil()).isEqualTo(new OilLevel(3));
        assertThat(moistureRich).isNotEqualTo(oilRich);
    }

    @Test
    @DisplayName("수분감이 없으면 만들 수 없다")
    public void rejectsMissingMoisture() {
        assertThatThrownBy(() -> new ProductSensory(null, OIL, CONFIDENCE, MODEL_VERSION))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품 수분감 단계가 필요합니다.");
    }

    @Test
    @DisplayName("유분감이 없으면 만들 수 없다")
    public void rejectsMissingOil() {
        assertThatThrownBy(() -> new ProductSensory(MOISTURE, null, CONFIDENCE, MODEL_VERSION))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품 유분감 단계가 필요합니다.");
    }

    @Test
    @DisplayName("신뢰도가 없으면 만들 수 없다")
    public void rejectsMissingConfidence() {
        assertThatThrownBy(() -> new ProductSensory(MOISTURE, OIL, null, MODEL_VERSION))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품 감각 추론 신뢰도가 필요합니다.");
    }

    @Test
    @DisplayName("모델 버전이 없으면 만들 수 없다")
    public void rejectsMissingModelVersion() {
        assertThatThrownBy(() -> new ProductSensory(MOISTURE, OIL, CONFIDENCE, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품 감각 추론 모델 버전이 필요합니다.");
    }
}
