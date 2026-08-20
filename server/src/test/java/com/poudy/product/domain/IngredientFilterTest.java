package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 필터")
class IngredientFilterTest {

    @Test
    @DisplayName("같은 성분이 포함과 제외에 함께 있으면 만들 수 없다")
    void rejectsIngredientPresentInBothSides() {
        assertThatThrownBy(() -> new IngredientFilter(List.of(1001L, 1005L), List.of(1005L)))
                .isInstanceOf(ConflictingIngredientFilterException.class);
    }

    @Test
    @DisplayName("포함과 제외가 겹치지 않으면 만들 수 있다")
    void acceptsDisjointSides() {
        assertThatCode(() -> new IngredientFilter(List.of(1005L), List.of(1001L))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("조건이 없으면 빈 목록으로 채운다")
    void fillsMissingSidesWithEmptyLists() {
        IngredientFilter filter = new IngredientFilter(null, null);

        assertThat(filter.includedIds()).isEmpty();
        assertThat(filter.excludedIds()).isEmpty();
        assertThatCode(() -> new IngredientFilter(List.of(1005L), null)).doesNotThrowAnyException();
        assertThatCode(() -> new IngredientFilter(null, List.of(1001L))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("포함 성분이 제외 성분군에 속하면 만들 수 없다")
    void rejectsIngredientCoveredByExcludedCode() {
        assertThatThrownBy(() -> IngredientFilter.of(List.of(3551L), null, Set.of(3551L, 213L)))
                .isInstanceOf(ConflictingIngredientFilterException.class);
    }

    @Test
    @DisplayName("제외 성분군을 성분으로 풀어 제외 목록에 넣는다")
    void resolvesExcludedCodesIntoIngredientIds() {
        IngredientFilter filter = IngredientFilter.of(List.of(1005L), List.of(1001L), Set.of(1079L, 1050L));

        assertThat(filter.excludedIds()).contains(1001L, 1079L, 1050L);
    }

    @Test
    @DisplayName("제외 성분군이 없으면 제외 목록을 그대로 쓴다")
    void keepsExcludedIdsWhenNoCodeGiven() {
        assertThat(IngredientFilter.of(List.of(1005L), List.of(1001L), null).excludedIds()).containsExactly(1001L);
        assertThat(IngredientFilter.of(null, null, Set.of()).excludedIds()).isEmpty();
    }

    @Test
    @DisplayName("성분군과 성분으로 같은 제외를 중복해 보내도 한 번만 남는다")
    void deduplicatesResolvedExclusions() {
        assertThat(IngredientFilter.of(null, List.of(1079L), Set.of(1079L, 1050L)).excludedIds())
                .filteredOn(id -> id.equals(1079L)).hasSize(1);
    }
}
