package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.skintype.domain.SkinType;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("제품 조회 조건")
class ProductQueryTest {

    @Test
    @DisplayName("피부타입만 선택해도 필터가 있다고 판단한다")
    void recognizesSkinTypeFilter() {
        List<SkinType> skinTypes = new ArrayList<>(List.of(SkinType.DRY));
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
            skinTypes,
            false,
            List.of()
        );

        skinTypes.clear();

        assertThat(query.hasFilters()).isTrue();
    }

    @Test
    @DisplayName("민감성만 선택해도 필터가 있다고 판단한다")
    void recognizesSensitiveSkinFilter() {
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
            null,
            true,
            List.of()
        );

        assertThat(query.hasFilters()).isTrue();
    }

    @Test
    @DisplayName("누락된 목록 조건은 필터로 판단하지 않는다")
    void defaultsMissingListsToEmpty() {
        ProductQuery query = new ProductQuery(
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
            null,
            false,
            List.of()
        );

        assertThat(query.hasKeyword()).isTrue();
        assertThat(query.hasFilters()).isFalse();
        assertThat(query.hasIncludeConditions()).isFalse();
        assertThat(query.hasIncludedIngredients()).isFalse();
        assertThat(query.hasExcludeConditions()).isFalse();
    }

    @Test
    @DisplayName("생성 후 원본 목록에 조건을 추가해도 필터 판단은 바뀌지 않는다")
    void copiesListConditions() {
        List<Long> categoryIds = new ArrayList<>();
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
            null,
            false,
            List.of()
        );

        categoryIds.add(1L);

        assertThat(query.hasFilters()).isFalse();
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
            null,
            false,
            List.of()
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
            null,
            false,
            List.of()
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
            null,
            false,
            List.of()
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
            null,
            false,
            List.of()
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
            null,
            false,
            List.of()
        );

        assertThat(excludeOnly.hasIncludeConditions()).isFalse();
        assertThat(excludeOnly.hasIncludedIngredients()).isFalse();
        assertThat(includeIngredient.hasIncludeConditions()).isTrue();
        assertThat(includeIngredient.hasIncludedIngredients()).isTrue();
        assertThat(includeIngredient.hasExcludeConditions()).isFalse();
        assertThat(includeGroup.hasIncludeConditions()).isTrue();
        assertThat(includeGroup.hasIncludedIngredients()).isFalse();
        assertThat(includeGroup.hasExcludeConditions()).isFalse();
    }

    @Test
    @DisplayName("원본 포함 성분을 지워도 포함 성분과 필터가 있다고 판단한다")
    void copiesIncludedIngredients() {
        List<Long> ingredientIds = new ArrayList<>(List.of(1L));
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            ingredientIds,
            null,
            null,
            null,
            null,
            null,
            false,
            List.of()
        );

        ingredientIds.clear();

        assertThat(query.hasIncludedIngredients()).isTrue();
        assertThat(query.hasIncludeConditions()).isTrue();
        assertThat(query.hasFilters()).isTrue();
    }

    @Test
    @DisplayName("원본 포함 성분군을 지워도 성분군 포함 조건을 유지한다")
    void copiesIncludedGroups() {
        List<String> groupCodes = new ArrayList<>(List.of("CERAMIDES"));
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            groupCodes,
            null,
            null,
            false,
            List.of()
        );

        groupCodes.clear();

        assertThat(query.hasIncludedIngredients()).isFalse();
        assertThat(query.hasIncludeConditions()).isTrue();
        assertThat(query.hasFilters()).isTrue();
    }

    @ParameterizedTest
    @MethodSource("excludedConditions")
    @DisplayName("제외 성분·빠른 제외·제외 성분군을 판단하고 원본 변경에도 조건을 유지한다")
    void recognizesAndCopiesExcludeConditions(
        List<Long> ingredientIds,
        List<ExcludeCode> codes,
        List<String> groupCodes
    ) {
        List<Long> excludedIngredients = new ArrayList<>(ingredientIds);
        List<ExcludeCode> excludedCodes = new ArrayList<>(codes);
        List<String> excludedGroups = new ArrayList<>(groupCodes);
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            excludedIngredients,
            excludedCodes,
            null,
            excludedGroups,
            null,
            false,
            List.of()
        );

        assertThat(query.hasExcludeConditions()).isTrue();
        assertThat(query.hasIncludeConditions()).isFalse();

        excludedIngredients.clear();
        excludedCodes.clear();
        excludedGroups.clear();

        assertThat(query.hasExcludeConditions()).isTrue();
        assertThat(query.hasFilters()).isTrue();
    }

    private static Stream<Arguments> excludedConditions() {
        return Stream.of(
            Arguments.of(List.of(1L), List.of(), List.of()),
            Arguments.of(List.of(), List.of(ExcludeCode.SULFATES), List.of()),
            Arguments.of(List.of(), List.of(), List.of("CERAMIDES"))
        );
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
            null,
            false,
            List.of()
        );

        assertThat(query.hasFilters()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(doubles = {-0.5, 1.2, 2.25, 3.5})
    @DisplayName("0.5 단위가 아니거나 0부터 3까지가 아닌 수분감·유분감 필터는 거부한다")
    void rejectsInvalidLevels(double level) {
        assertThatThrownBy(
            () -> new ProductQuery(
                null,
                null,
                null,
                List.of(level),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                List.of()
            )
        )
            .isInstanceOf(InvalidSensoryFilterException.class);
        assertThatThrownBy(
            () -> new ProductQuery(
                null,
                null,
                null,
                null,
                List.of(level),
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                List.of()
            )
        )
            .isInstanceOf(InvalidSensoryFilterException.class);
    }
}
