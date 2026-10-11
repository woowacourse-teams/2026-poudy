package com.poudy.product.controller;

import com.poudy.product.controller.dto.ProductSimilarityResponse;
import com.poudy.product.service.ProductSimilarityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품", description = "제품 조회 API")
@RestController
@RequestMapping("/api/products")
public class ProductSimilarityController {
    private final ProductSimilarityService service;

    public ProductSimilarityController(ProductSimilarityService service) {
        this.service = service;
    }

    @Operation(summary = "성분이 유사한 제품 조회", description = "외부에서 계산해 저장한 유사 제품을 최대 3개 조회한다. "
        + "partId가 없으면 표시 순서가 가장 앞선 구성품을 기준으로 한다. 내부 유사도 점수는 반환하지 않는다.")
    @GetMapping("/{productId}/similarities")
    public ResponseEntity<ProductSimilarityResponse> find(
        @PathVariable Long productId,
        @RequestParam(required = false) Long partId
    ) {
        return ResponseEntity.ok(ProductSimilarityResponse.from(service.find(productId, partId)));
    }
}
