package com.poudy.product.controller;

import com.poudy.product.controller.dto.ProductSimilarityRequest;
import com.poudy.product.controller.dto.ProductSimilarityResponse;
import com.poudy.product.service.ProductSimilarityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
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

    @Operation(summary = "성분이 유사한 제품 조회", description = "기본 3개, size로 최대 10개를 조회한다. "
        + "유사도 상위 size개를 먼저 확정하고 그 안에서 성분 유사순 또는 단위 가격순으로 정렬한다. "
        + "가격 비교 불가 후보는 가격순 목록 뒤에 두고 동점은 기존 유사도 순서를 유지한다. "
        + "partId가 없으면 표시 순서가 가장 앞선 구성품을 기준으로 한다. 내부 유사도 점수는 반환하지 않는다.")
    @GetMapping("/{productId}/similarities")
    public ResponseEntity<ProductSimilarityResponse> find(
        @PathVariable Long productId,
        @RequestParam(required = false) Long partId,
        @Valid @ModelAttribute ProductSimilarityRequest query
    ) {
        return ResponseEntity.ok(
            ProductSimilarityResponse.from(service.find(productId, partId, query.size(), query.sort()))
        );
    }
}
