package com.poudy.ingredientgroup.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분군 목록")
class IngredientGroupCatalogTest {

    private static final IngredientGroup CERAMIDES = new IngredientGroup("CERAMIDES", "세라마이드 계열", List.of(1L, 2L, 3L));
    private static final IngredientGroup LIPIDS = new IngredientGroup("LIPIDS", "지질 계열", List.of(2L, 3L, 4L, 5L));

    @Test
    @DisplayName("같은 성분군의 성분을 처음 나온 자리에 묶고 나머지는 하나씩 둔다")
    void bundlesAtFirstAppearance() {
        IngredientGroupCatalog catalog = new IngredientGroupCatalog(List.of(CERAMIDES));

        assertThat(catalog.bundle(List.of(9L, 1L, 8L, 3L)))
            .containsExactly(
                new IngredientBundle(null, List.of(9L)),
                new IngredientBundle(CERAMIDES, List.of(1L, 3L)),
                new IngredientBundle(null, List.of(8L))
            );
    }

    @Test
    @DisplayName("성분군에 속한 성분이 하나뿐이면 묶지 않는다")
    void leavesSingleMemberUnbundled() {
        IngredientGroupCatalog catalog = new IngredientGroupCatalog(List.of(CERAMIDES));

        assertThat(catalog.bundle(List.of(1L, 9L)))
            .containsExactly(new IngredientBundle(null, List.of(1L)), new IngredientBundle(null, List.of(9L)));
    }

    @Test
    @DisplayName("여러 성분군에 속하면 더 많은 성분을 묶는 성분군을 고른다")
    void prefersGroupBundlingMoreIngredients() {
        IngredientGroupCatalog catalog = new IngredientGroupCatalog(List.of(CERAMIDES, LIPIDS));

        assertThat(catalog.bundle(List.of(2L, 3L, 4L)))
            .containsExactly(new IngredientBundle(LIPIDS, List.of(2L, 3L, 4L)));
    }

    @Test
    @DisplayName("다른 성분군에 성분을 내주고 하나만 남은 성분군은 묶지 않는다")
    void leavesGroupWithSingleRemainingMemberUnbundled() {
        IngredientGroupCatalog catalog = new IngredientGroupCatalog(List.of(CERAMIDES, LIPIDS));

        assertThat(catalog.bundle(List.of(1L, 2L, 3L, 4L)))
            .containsExactly(
                new IngredientBundle(CERAMIDES, List.of(1L, 2L, 3L)),
                new IngredientBundle(null, List.of(4L))
            );
    }

    @Test
    @DisplayName("묶는 성분 수가 같으면 코드 순서가 앞선 성분군을 고른다")
    void breaksTieByCode() {
        IngredientGroupCatalog catalog = new IngredientGroupCatalog(List.of(LIPIDS, CERAMIDES));

        assertThat(catalog.bundle(List.of(2L, 3L)))
            .containsExactly(new IngredientBundle(CERAMIDES, List.of(2L, 3L)));
    }
}
