package com.poudy.brand.controller;

import com.poudy.brand.dto.BrandListResponse;
import com.poudy.brand.dto.BrandResponse;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/brands")
public class BrandController {

    private static final BrandResponse SAMPLE_BRAND = new BrandResponse(12L, "브랜드명",
            "https://cdn.example.com/brands/12/logo.png", 48L);

    @GetMapping
    public ResponseEntity<BrandListResponse> findBrands(@RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(new BrandListResponse(List.of(SAMPLE_BRAND)));
    }

    @GetMapping("/{brandId}")
    public ResponseEntity<BrandResponse> findBrand(@PathVariable Long brandId) {
        return ResponseEntity.ok(SAMPLE_BRAND);
    }
}
