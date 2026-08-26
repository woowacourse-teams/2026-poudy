package com.poudy.category.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.product.domain.CategoryProductCount;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리 서비스")
class CategoryServiceTest {

    @Test
    @DisplayName("카테고리 계층을 조회한다")
    void findsCategories() {
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Category toner = new Category(2L, 1L, "토너", 1);
        Category serum = new Category(3L, 1L, "세럼", 1);
        Categories categories = Categories.from(List.of(skinCare, toner, serum));
        CategoryProductCount tonerCount = new CategoryProductCount(toner, 2L, List.of());
        List<CategoryProductCount> productCounts = List.of(
                new CategoryProductCount(skinCare, 2L, List.of(tonerCount)));
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        Products products = mock(Products.class);
        given(categoryRepository.findAll()).willReturn(categories);
        given(productRepository.findAll()).willReturn(products);
        given(products.productCountsByCategory(categories)).willReturn(productCounts);
        CategoryService categoryService = new CategoryService(categoryRepository, productRepository);

        List<CategoryProductCount> found = categoryService.findCategories();

        assertThat(found).isSameAs(productCounts);
    }
}
