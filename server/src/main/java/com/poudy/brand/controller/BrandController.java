package com.poudy.brand.controller;

import com.poudy.brand.controller.dto.BrandDetailResponse;
import com.poudy.brand.controller.dto.BrandListItemResponse;
import com.poudy.brand.controller.dto.BrandListResponse;
import com.poudy.category.controller.dto.CategoryChildResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "브랜드", description = "브랜드 조회 API")
@RestController
@RequestMapping("/api/brands")
public class BrandController {

    private static final Long SAMPLE_BRAND_ID = 12L;
    private static final String SAMPLE_BRAND_NAME = "라운드랩";
    private static final String SAMPLE_BRAND_ENGLISH_NAME = "ROUND LAB";
    private static final List<CategoryResponse> SAMPLE_CATEGORIES = List.of(
            new CategoryResponse(
                    1L,
                    "스킨케어",
                    List.of(new CategoryChildResponse(7L, "토너", 12L), new CategoryChildResponse(8L, "세럼", 9L)),
                    21L),
            new CategoryResponse(2L, "클렌징", List.of(), 6L));

    @Operation(summary = "브랜드 조회", description = "전체 브랜드를 브랜드명 오름차순으로 조회하고 브랜드마다 제품 수를 함께 싣는다.")
    @GetMapping
    public ResponseEntity<BrandListResponse> findBrands() {
        return ResponseEntity.ok(new BrandListResponse(List.of(sampleBrandListItem(SAMPLE_BRAND_ID))));
    }

    @Operation(summary = "브랜드 상세 조회", description = "브랜드 ID 에 해당하는 정보와 이 브랜드 제품이 속한 카테고리를 조회한다. "
            + "브랜드에 속한 제품은 제품 조회에서 brandIds 로 받는다.")
    @GetMapping("/{brandId}")
    public ResponseEntity<BrandDetailResponse> findBrand(@Parameter(example = "12") @PathVariable Long brandId) {
        return ResponseEntity.ok(sampleBrandDetail(brandId));
    }

    private BrandListItemResponse sampleBrandListItem(Long id) {
        return new BrandListItemResponse(id, SAMPLE_BRAND_NAME, SAMPLE_BRAND_ENGLISH_NAME, imageUrl(id), 27L);
    }

    private BrandDetailResponse sampleBrandDetail(Long id) {
        return new BrandDetailResponse(
                id,
                SAMPLE_BRAND_NAME,
                SAMPLE_BRAND_ENGLISH_NAME,
                imageUrl(id),
                SAMPLE_CATEGORIES);
    }

    private String imageUrl(Long id) {
        return "https://cdn.example.com/brands/" + id + "/image.png";
    }
}
