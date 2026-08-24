package com.poudy.category.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리 목록")
class CategoriesTest {

    @Test
    @DisplayName("대분류를 입력 순서대로 반환한다")
    void findsParentsInInputOrder() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category cleansing = parent(3L, "클렌징");
        Category cleansingFoam = child(4L, 3L, "클렌징폼");
        Categories categories = new Categories(List.of(skinCare, toner, cleansing, cleansingFoam));

        assertThat(categories.parents()).containsExactly(skinCare, cleansing);
    }

    @Test
    @DisplayName("대분류의 소분류를 입력 순서대로 반환한다")
    void findsChildrenOfParentInInputOrder() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category serum = child(3L, 1L, "세럼");
        Category cleansing = parent(4L, "클렌징");
        Category cleansingFoam = child(5L, 4L, "클렌징폼");
        Categories categories = new Categories(List.of(skinCare, toner, serum, cleansing, cleansingFoam));

        assertThat(categories.childrenOf(skinCare)).containsExactly(toner, serum);
    }

    @Test
    @DisplayName("하위 카테고리가 없는 대분류는 허용하지 않는다")
    void rejectsParentWithoutChild() {
        Category skinCare = parent(1L, "스킨케어");

        assertThatThrownBy(() -> new Categories(List.of(skinCare))).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("대분류는 하나 이상의 소분류를 가져야 합니다.");
    }

    @Test
    @DisplayName("존재하지 않는 대분류를 참조하는 소분류는 허용하지 않는다")
    void rejectsChildWithoutParent() {
        Category toner = child(2L, 1L, "토너");

        assertThatThrownBy(() -> new Categories(List.of(toner))).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("소분류는 존재하는 대분류를 부모로 가져야 합니다.");
    }

    @Test
    @DisplayName("소분류를 부모로 참조하는 카테고리는 허용하지 않는다")
    void rejectsChildWhoseParentIsChild() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category moisturizingToner = child(3L, 2L, "보습 토너");

        assertThatThrownBy(() -> new Categories(List.of(skinCare, toner, moisturizingToner)))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("소분류는 존재하는 대분류를 부모로 가져야 합니다.");
    }

    @Test
    @DisplayName("소분류를 기준으로 하위 목록을 조회할 수 없다")
    void rejectsFindingChildrenOfChild() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Categories categories = new Categories(List.of(skinCare, toner));

        assertThatThrownBy(() -> categories.childrenOf(toner)).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("대분류의 소분류만 조회할 수 있습니다.");
    }

    @Test
    @DisplayName("ID 로 카테고리를 조회한다")
    void findsCategoryById() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Categories categories = new Categories(List.of(skinCare, toner));

        assertThat(categories.findById(2L)).contains(toner);
        assertThat(categories.findById(999L)).isEmpty();
    }

    @Test
    @DisplayName("제품 카테고리의 대분류부터 소분류까지 경로를 찾는다")
    void findsCategoryPath() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Categories categories = new Categories(List.of(skinCare, toner));

        assertThat(categories.pathOf(toner)).containsExactly(skinCare, toner);
        assertThat(categories.pathOf(skinCare)).containsExactly(skinCare);
    }

    @Test
    @DisplayName("같은 ID의 카테고리는 허용하지 않는다")
    void rejectsDuplicateIds() {
        Category skinCare = parent(1L, "스킨케어");
        Category duplicate = parent(1L, "클렌징");

        assertThatThrownBy(() -> new Categories(List.of(skinCare, duplicate)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("카테고리 ID는 중복될 수 없습니다.");
    }

    private static Category parent(Long id, String name) {
        return new Category(id, null, name, 0);
    }

    private static Category child(Long id, Long parentId, String name) {
        return new Category(id, parentId, name, 1);
    }
}
