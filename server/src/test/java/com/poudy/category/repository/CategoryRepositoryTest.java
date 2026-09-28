package com.poudy.category.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("카테고리 저장소")
class CategoryRepositoryTest {

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    @DisplayName("DB의 카테고리를 표시 순서대로 계층 도메인으로 조회한다")
    void findsAllCategories() {
        Categories categories = categoryRepository.findAll();

        assertThat(categories.parents()).extracting(Category::id).containsExactly(1L, 13L);
        Category skinCare = categories.findById(1L).orElseThrow();
        assertThat(categories.childrenOf(skinCare)).extracting(Category::name)
            .containsExactly("스킨/토너", "에센스/세럼/앰플");
    }
}
