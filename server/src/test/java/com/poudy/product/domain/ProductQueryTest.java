package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.excludecode.domain.ExcludeCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("제품 조회 조건")
class ProductQueryTest {

    @Test
    @DisplayName("피부타입만 선택해도 필터가 있다고 판단한다")
    void recognizesSkinTypeFilter() {
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            com.poudy.skintype.domain.SkinType.DRY
        );
        assertThat(query.hasFilters()).isTrue();
    }

    @Test
    @DisplayName("누락된 목록 조건을 빈 목록으로 다룬다")
    void defaultsMissingListsToEmpty() {
        ProductQuery query = new ProductQuery("토너", null, null, null, null, null, null, null, null, null, null);

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
        ProductQuery query = new ProductQuery(
            "토너",
            categoryIds,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );

        categoryIds.add(2L);

        assertThat(query.categoryIds()).containsExactly(1L);
        assertThatThrownBy(() -> query.categoryIds().add(3L))
            .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("목록 조건 중 하나라도 있으면 필터가 있다고 판단한다")
    void checksWhetherItHasFilters() {
        ProductQuery noFilters = new ProductQuery(
            "토너",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
        ProductQuery withFilter = new ProductQuery(
            "토너",
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(ExcludeCode.SULFATES),
            null,
            null,
            null
        );

        assertThat(noFilters.hasFilters()).isFalse();
        assertThat(withFilter.hasFilters()).isTrue();
    }

    @Test
    @DisplayName("포함 성분이나 포함 성분군이 있을 때만 포함 조건이 있다고 판단한다")
    void recognizesIncludeConditions() {
        ProductQuery excludeOnly = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(1L),
            null,
            null,
            List.of("CERAMIDES"),
            null
        );
        ProductQuery includeIngredient = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            List.of(1L),
            null,
            null,
            null,
            null,
            null
        );
        ProductQuery includeGroup = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            List.of("CERAMIDES"),
            null,
            null
        );

        assertThat(excludeOnly.hasIncludeConditions()).isFalse();
        assertThat(includeIngredient.hasIncludeConditions()).isTrue();
        assertThat(includeGroup.hasIncludeConditions()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(doubles = {0, 0.5, 2.5, 3})
    @DisplayName("0부터 3까지 0.5 단위의 수분감·유분감 필터를 받는다")
    void acceptsHalfStepLevels(double level) {
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            List.of(level),
            List.of(level),
            null,
            null,
            null,
            null,
            null,
            null
        );

        assertThat(query.moistureLevels()).containsExactly(level);
        assertThat(query.oilLevels()).containsExactly(level);
    }

    @ParameterizedTest
    @ValueSource(doubles = {-0.5, 1.2, 2.25, 3.5})
    @DisplayName("0.5 단위가 아니거나 0부터 3까지가 아닌 수분감·유분감 필터는 거부한다")
    void rejectsInvalidLevels(double level) {
        assertThatThrownBy(
            () -> new ProductQuery(null, null, null, List.of(level), null, null, null, null, null, null, null)
        )
            .isInstanceOf(InvalidSensoryFilterException.class);
        assertThatThrownBy(
            () -> new ProductQuery(null, null, null, null, List.of(level), null, null, null, null, null, null)
        )
            .isInstanceOf(InvalidSensoryFilterException.class);
    }
}
