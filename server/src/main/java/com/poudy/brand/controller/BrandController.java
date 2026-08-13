package com.poudy.brand.controller;

import com.poudy.brand.dto.BrandListResponse;
import com.poudy.brand.dto.BrandResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "브랜드", description = "브랜드 조회 API")
@RestController
@RequestMapping("/api/brands")
public class BrandController {

    @Operation(summary = "브랜드 조회", description = "브랜드 목록을 조회하거나 브랜드명으로 검색한다. keyword 를 생략하면 전체를 브랜드명 오름차순으로 반환한다.")
    @GetMapping
    public ResponseEntity<BrandListResponse> findBrands(@RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(new BrandListResponse(List.of(sampleBrand(12L))));
    }

    @Operation(summary = "브랜드 상세 조회", description = "브랜드 ID 에 해당하는 상세 정보를 조회한다.")
    @GetMapping("/{brandId}")
    public ResponseEntity<BrandResponse> findBrand(@PathVariable Long brandId) {
        return ResponseEntity.ok(sampleBrand(brandId));
    }

    private BrandResponse sampleBrand(Long id) {
        return new BrandResponse(id, "브랜드명", "https://cdn.example.com/brands/" + id + "/logo.png", 48L);
    }
}
