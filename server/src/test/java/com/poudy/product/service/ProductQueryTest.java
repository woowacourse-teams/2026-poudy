package com.poudy.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.excludecode.domain.ExcludeCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 조회 조건")
class ProductQueryTest {

    @Test
    @DisplayName("누락된 목록 조건을 빈 목록으로 다룬다")
    void defaultsMissingListsToEmpty() {
        ProductQuery query = new ProductQuery("토너", null, null, null, null, null, null, null);

        assertThat(query.categoryIds()).isEmpty();
        assertThat(query.brandIds()).isEmpty();
        assertThat(query.moistureLevels()).isEmpty();
        assertThat(query.oilLevels()).isEmpty();
        assertThat(query.includeIngredientIds()).isEmpty();
        assertThat(query.excludeIngredientIds()).isEmpty();
        assertThat(query.excludeCodes()).isEmpty();
    }

    @Test
    @DisplayName("목록 조건을 방어적으로 복사한다")
    void copiesListConditions() {
        List<Long> categoryIds = new ArrayList<>(List.of(1L));
        ProductQuery query = new ProductQuery("토너", categoryIds, null, null, null, null, null, null);

        categoryIds.add(2L);

        assertThat(query.categoryIds()).containsExactly(1L);
        assertThatThrownBy(() -> query.categoryIds().add(3L))
            .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("목록 조건 중 하나라도 있으면 필터가 있다고 판단한다")
    void checksWhetherItHasFilters() {
        ProductQuery noFilters = new ProductQuery("토너", null, null, null, null, null, null, null);
        ProductQuery withFilter = new ProductQuery(
            "토너",
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(ExcludeCode.SULFATES)
        );

        assertThat(noFilters.hasFilters()).isFalse();
        assertThat(withFilter.hasFilters()).isTrue();
    }
}
