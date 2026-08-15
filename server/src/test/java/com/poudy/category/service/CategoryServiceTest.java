package com.poudy.category.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리 서비스")
class CategoryServiceTest {

    @Test
    @DisplayName("카테고리 계층과 제품 수를 함께 조회한다")
    void findsCategoriesWithProductCounts() {
        Category skinCare = new Category(1L, null, "스킨케어", 0, null, null);
        Category toner = new Category(2L, 1L, "토너", 1, null, null);
        Category serum = new Category(3L, 1L, "세럼", 1, null, null);
        Categories categories = new Categories(List.of(skinCare, toner, serum));
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        given(categoryRepository.findAll()).willReturn(categories);
        given(productRepository.countByCategoryId()).willReturn(Map.of(2L, 2L, 3L, 1L));
        CategoryService categoryService = new CategoryService(categoryRepository, productRepository);

        CategoryCounts categoryCounts = categoryService.findCategories();

        assertThat(categoryCounts.parents()).containsExactly(skinCare);
        assertThat(categoryCounts.childrenOf(skinCare)).containsExactly(toner, serum);
        assertThat(categoryCounts.productCountOf(skinCare)).isEqualTo(3L);
        assertThat(categoryCounts.productCountOf(toner)).isEqualTo(2L);
        assertThat(categoryCounts.productCountOf(serum)).isEqualTo(1L);
    }
}
