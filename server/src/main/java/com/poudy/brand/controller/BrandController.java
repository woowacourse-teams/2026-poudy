package com.poudy.brand.controller;

import com.poudy.brand.controller.dto.BrandDetailResponse;
import com.poudy.brand.controller.dto.BrandListResponse;
import com.poudy.brand.service.BrandService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "브랜드", description = "브랜드 조회 API")
@RestController
@RequestMapping("/api/brands")
public class BrandController {

    private final BrandService brandService;

    public BrandController(BrandService brandService) {
        this.brandService = brandService;
    }

    @Operation(summary = "브랜드 조회", description = "전체 브랜드를 브랜드명 오름차순으로 조회하고 브랜드마다 제품 수를 함께 싣는다.")
    @GetMapping
    public ResponseEntity<BrandListResponse> findBrands() {
        return ResponseEntity.ok(BrandListResponse.from(brandService.findBrands()));
    }

    @Operation(summary = "브랜드 상세 조회", description = "브랜드 ID 에 해당하는 정보와 이 브랜드 제품이 속한 카테고리를 조회한다. "
            + "브랜드에 속한 제품은 제품 조회에서 brandIds 로 받는다.")
    @GetMapping("/{brandId}")
    public ResponseEntity<BrandDetailResponse> findBrand(@Parameter(example = "12") @PathVariable Long brandId) {
        return ResponseEntity.ok(BrandDetailResponse.sample(brandId));
    }
}
