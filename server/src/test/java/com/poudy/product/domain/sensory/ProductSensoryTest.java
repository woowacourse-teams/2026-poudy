package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("제품 수분감·유분감")
public class ProductSensoryTest {

    private static final MoistureLevel MOISTURE = new MoistureLevel(3);
    private static final OilLevel OIL = new OilLevel(0);

    @ParameterizedTest
    @ValueSource(strings = {"향수", "클렌징"})
    @DisplayName("향수·클렌징에는 저장된 유수분 단계가 있어도 제공하지 않는다")
    void excludesCategories(String category) {
        ProductSensory sensory = ProductSensory.forCategory(category, 2.5, 1);
        assertThat(sensory.isAvailable()).isFalse();
        assertThat(sensory.moistureLevel()).isNull();
        assertThat(sensory.oilLevel()).isNull();
    }

    @Test
    @DisplayName("스킨케어의 유수분 0단계는 미제공과 구별한다")
    void keepsZeroForSupportedCategory() {
        ProductSensory sensory = ProductSensory.forCategory("스킨케어", 0, 0);
        assertThat(sensory.isAvailable()).isTrue();
        assertThat(sensory.moistureLevel()).isZero();
        assertThat(sensory.oilLevel()).isZero();
    }

    @Test
    @DisplayName("수분감과 유분감을 서로 독립된 축으로 보관한다")
    public void keepsMoistureAndOilAsIndependentAxes() {
        ProductSensory moistureRich = new ProductSensory(MOISTURE, OIL);
        ProductSensory oilRich = new ProductSensory(new MoistureLevel(0), new OilLevel(3));

        assertThat(moistureRich.moistureLevel()).isEqualTo(3.0);
        assertThat(moistureRich.oilLevel()).isZero();
        assertThat(oilRich.moistureLevel()).isZero();
        assertThat(oilRich.oilLevel()).isEqualTo(3.0);
        assertThat(moistureRich).isNotEqualTo(oilRich);
    }

    @Test
    @DisplayName("수분감이 없으면 만들 수 없다")
    public void rejectsMissingMoisture() {
        assertThatThrownBy(() -> new ProductSensory(null, OIL))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품 수분감 단계가 필요합니다.");
    }

    @Test
    @DisplayName("유분감이 없으면 만들 수 없다")
    public void rejectsMissingOil() {
        assertThatThrownBy(() -> new ProductSensory(MOISTURE, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품 유분감 단계가 필요합니다.");
    }
}
