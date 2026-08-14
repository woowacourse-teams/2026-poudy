package com.poudy.brand.controller;

import com.poudy.brand.controller.dto.BrandListResponse;
import com.poudy.brand.controller.dto.BrandResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "브랜드", description = "브랜드 조회 API")
@RestController
@RequestMapping("/api/brands")
public class BrandController {

    private static final Long SAMPLE_BRAND_ID = 12L;
    private static final String SAMPLE_BRAND_NAME = "라운드랩";
    private static final String SAMPLE_BRAND_ENGLISH_NAME = "ROUND LAB";
    private static final Long SAMPLE_PRODUCT_COUNT = 48L;

    @Operation(summary = "브랜드 조회", description = "전체 브랜드를 브랜드명 오름차순으로 조회한다.")
    @GetMapping
    public ResponseEntity<BrandListResponse> findBrands() {
        return ResponseEntity.ok(new BrandListResponse(List.of(sampleBrand(SAMPLE_BRAND_ID))));
    }

    private BrandResponse sampleBrand(Long id) {
        return new BrandResponse(
                id,
                SAMPLE_BRAND_NAME,
                SAMPLE_BRAND_ENGLISH_NAME,
                "https://cdn.example.com/brands/" + id + "/logo.png",
                SAMPLE_PRODUCT_COUNT);
    }
}
