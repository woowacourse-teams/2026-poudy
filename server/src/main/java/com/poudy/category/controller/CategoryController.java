package com.poudy.category.controller;

import com.poudy.category.controller.dto.CategoryListResponse;
import com.poudy.category.domain.Categories;
import com.poudy.category.service.CategoryService;
import com.poudy.product.domain.ProductCountsByCategory;
import com.poudy.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "카테고리", description = "카테고리 조회 API")
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final ProductService productService;

    public CategoryController(CategoryService categoryService, ProductService productService) {
        this.categoryService = categoryService;
        this.productService = productService;
    }

    @Operation(summary = "카테고리 조회", description = "제품 필터에서 사용하는 전체 카테고리를 계층 구조로 조회한다.")
    @GetMapping
    public ResponseEntity<CategoryListResponse> findCategories() {
        Categories categories = categoryService.findCategories();
        ProductCountsByCategory productCounts = productService.countsByCategory();
        CategoryListResponse categoryListResponse = CategoryListResponse.from(categories, productCounts);

        return ResponseEntity.ok(categoryListResponse);
    }
}
