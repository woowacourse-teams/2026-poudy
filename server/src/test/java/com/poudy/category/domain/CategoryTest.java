package com.poudy.category.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리")
class CategoryTest {

    @Test
    @DisplayName("깊이가 0이고 부모가 없으면 대분류이다")
    void identifiesParent() {
        Category category = new Category(1L, null, "스킨케어", 0, null, null);

        assertThat(category.isParent()).isTrue();
    }

    @Test
    @DisplayName("부모 ID가 같으면 해당 대분류의 소분류이다")
    void identifiesChildOfParent() {
        Category parent = new Category(1L, null, "스킨케어", 0, null, null);
        Category child = new Category(2L, 1L, "토너", 1, null, null);

        assertThat(child.isChildOf(parent)).isTrue();
    }

    @Test
    @DisplayName("대분류는 부모 카테고리를 가질 수 없다")
    void rejectsParentWithParentId() {
        assertThatThrownBy(() -> new Category(1L, 2L, "스킨케어", 0, null, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("대분류는 부모 카테고리를 가질 수 없습니다.");
    }

    @Test
    @DisplayName("소분류는 부모 카테고리를 가져야 한다")
    void rejectsChildWithoutParentId() {
        assertThatThrownBy(() -> new Category(2L, null, "토너", 1, null, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("소분류는 부모 카테고리를 가져야 합니다.");
    }

    @Test
    @DisplayName("카테고리는 두 단계 깊이만 허용한다")
    void rejectsUnsupportedDepth() {
        assertThatThrownBy(() -> new Category(3L, 2L, "보습 토너", 2, null, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("카테고리 깊이는 0 또는 1이어야 합니다.");
    }
}
