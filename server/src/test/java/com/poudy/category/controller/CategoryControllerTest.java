package com.poudy.category.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.category.controller.dto.CategoryListResponse;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import com.poudy.category.service.CategoryService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("카테고리 컨트롤러")
class CategoryControllerTest {

    @Test
    @DisplayName("서비스에서 조회한 카테고리를 200 응답으로 반환한다")
    void findsCategories() {
        Category skinCare = new Category(1L, null, "스킨케어", 0, null, null);
        Category toner = new Category(2L, 1L, "토너", 1, null, null);
        CategoryCounts categoryCounts = new CategoryCounts(new Categories(List.of(skinCare, toner)), Map.of(2L, 1L));
        CategoryService categoryService = mock(CategoryService.class);
        given(categoryService.findCategories()).willReturn(categoryCounts);
        CategoryController controller = new CategoryController(categoryService);

        ResponseEntity<CategoryListResponse> response = controller.findCategories();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(CategoryListResponse.from(categoryCounts));
        verify(categoryService).findCategories();
    }
}
