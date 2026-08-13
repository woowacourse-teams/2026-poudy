package com.poudy.category.controller;

import com.poudy.category.controller.dto.CategoryChildResponse;
import com.poudy.category.controller.dto.CategoryListResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "카테고리", description = "카테고리 조회 API")
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private static final CategoryResponse SAMPLE_SKIN_CARE = new CategoryResponse(
            1L,
            "스킨케어",
            List.of(new CategoryChildResponse(7L, "토너", 30L), new CategoryChildResponse(8L, "세럼", 21L)),
            51L);
    private static final CategoryResponse SAMPLE_CLEANSING = new CategoryResponse(2L, "클렌징", List.of(), 12L);

    @Operation(summary = "카테고리 조회", description = "제품 필터에서 사용하는 전체 카테고리를 계층 구조로 조회한다.")
    @GetMapping
    public ResponseEntity<CategoryListResponse> findCategories() {
        return ResponseEntity.ok(new CategoryListResponse(List.of(SAMPLE_SKIN_CARE, SAMPLE_CLEANSING)));
    }
}
