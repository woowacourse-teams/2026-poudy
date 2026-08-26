package com.poudy.category.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.category.controller.dto.CategoryListResponse;
import com.poudy.category.domain.Category;
import com.poudy.category.service.CategoryService;
import com.poudy.product.domain.CategoryProductCount;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("카테고리 컨트롤러")
class CategoryControllerTest {

    @Test
    @DisplayName("서비스에서 조회한 카테고리를 200 응답으로 반환한다")
    void findsCategories() {
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Category toner = new Category(2L, 1L, "토너", 1);
        CategoryProductCount tonerCount = new CategoryProductCount(toner, 1L, List.of());
        List<CategoryProductCount> productCounts = List.of(
                new CategoryProductCount(skinCare, 1L, List.of(tonerCount)));
        CategoryService categoryService = mock(CategoryService.class);
        given(categoryService.findCategories()).willReturn(productCounts);
        CategoryController controller = new CategoryController(categoryService);

        ResponseEntity<CategoryListResponse> response = controller.findCategories();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(CategoryListResponse.from(productCounts));
        verify(categoryService).findCategories();
    }
}
