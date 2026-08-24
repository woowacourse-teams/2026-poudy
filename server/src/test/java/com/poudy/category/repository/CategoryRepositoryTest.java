package com.poudy.category.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.json.JsonDataReader;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리 저장소")
class CategoryRepositoryTest {

    @Test
    @DisplayName("카테고리 JSON을 계층 도메인으로 조회한다")
    void findsAllCategories() {
        JsonDataReader jsonDataReader = mock(JsonDataReader.class);
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Category toner = new Category(2L, 1L, "토너", 1);
        given(jsonDataReader.readList("categories.json", Category.class)).willReturn(List.of(skinCare, toner));

        Categories categories = new CategoryRepository(jsonDataReader).findAll();

        assertThat(categories.parents()).containsExactly(skinCare);
        assertThat(categories.childrenOf(skinCare)).containsExactly(toner);
    }
}
