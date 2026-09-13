package com.poudy.productview.controller;

import com.poudy.productview.service.ProductViewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품", description = "제품 조회 API")
@RestController
public class ProductViewController {

    private final ProductViewService productViewService;

    public ProductViewController(ProductViewService productViewService) {
        this.productViewService = productViewService;
    }

    @Operation(summary = "제품 조회 기록", description = "존재하는 제품의 조회수를 요청마다 1회 증가시킨다. "
        + "인증이나 방문자 중복 제거 없이 새로고침과 재방문도 집계한다. 상세·목록 GET은 조회수를 증가시키지 않는다.")
    @PostMapping("/api/products/{productId}/views")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void increaseViewCount(@Parameter(example = "101") @PathVariable Long productId) {
        productViewService.increaseViewCount(productId);
    }
}
