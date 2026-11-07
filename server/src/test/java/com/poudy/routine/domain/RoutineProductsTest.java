package com.poudy.routine.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("루틴 제품")
class RoutineProductsTest {

    @Test
    @DisplayName("아침과 저녁에는 같은 제품을 담을 수 있고 제품 ID 는 한 번씩만 센다")
    void allowsSameProductAcrossTimesOfDay() {
        RoutineProducts products = new RoutineProducts(List.of(1L, 2L), List.of(2L, 3L));

        assertThat(products.at(TimeOfDay.MORNING)).containsExactly(1L, 2L);
        assertThat(products.at(TimeOfDay.EVENING)).containsExactly(2L, 3L);
        assertThat(products.productIds()).containsExactly(1L, 2L, 3L);
    }

    @Test
    @DisplayName("한 구간에 같은 제품을 두 번 담으면 DUPLICATE_ROUTINE_PRODUCT 로 거절한다")
    void rejectsDuplicateInSameTimeOfDay() {
        assertThatThrownBy(() -> new RoutineProducts(List.of(), List.of(5L, 5L)))
            .isInstanceOf(InvalidRoutineException.class)
            .extracting("code")
            .hasToString("DUPLICATE_ROUTINE_PRODUCT");
    }
}
