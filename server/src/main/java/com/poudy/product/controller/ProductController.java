package com.poudy.product.controller;

import com.poudy.common.dto.KeywordRequest;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.product.controller.dto.ProductCountResponse;
import com.poudy.product.controller.dto.ProductDetailResponse;
import com.poudy.product.controller.dto.ProductFilterRequest;
import com.poudy.product.controller.dto.ProductPageResponse;
import com.poudy.product.controller.dto.ProductSortRequest;
import com.poudy.product.controller.dto.ProductSuggestionPageResponse;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품", description = "제품 조회 API")
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @Operation(summary = "제품 조회", description = "제품명 또는 브랜드명 검색어와 필터 조건에 해당하는 제품 목록을 조회한다. "
        + "keyword 와 필터 조건은 함께 보낼 수 있고 서로 AND 로 결합한다. " + "sort 와 페이지 조건도 함께 쓴다.")
    @GetMapping
    public ResponseEntity<ProductPageResponse> findProducts(
        @Valid @ModelAttribute ProductFilterRequest filter,
        @Valid @ModelAttribute ProductSortRequest sort,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        ProductPage products = productService.findProducts(
            filter.toQuery(),
            sort.sort(),
            pagination.page(),
            pagination.size()
        );
        return ResponseEntity.ok(ProductPageResponse.from(products, pagination));
    }

    @Operation(summary = "제품 조회 결과 개수 조회", description = "검색어와 필터 조건에 해당하는 제품 개수를 조회한다. 목록과 같은 조건을 같은 규칙으로 받는다.")
    @GetMapping("/count")
    public ResponseEntity<ProductCountResponse> countProducts(@Valid @ModelAttribute ProductFilterRequest filter) {
        return ResponseEntity.ok(ProductCountResponse.from(productService.countProducts(filter.toQuery())));
    }

    @Operation(summary = "제품 검색 제안 조회", description = "제품명 또는 브랜드명 검색어에 해당하는 제품을 ID, 이름, 이미지와 브랜드 이름만 담아 "
        + "페이지 단위로 조회한다. pagination.totalElements 는 페이지가 아니라 검색어에 해당하는 제품 전체를 센 값이다.")
    @Parameter(name = "keyword", example = "토너")
    @GetMapping("/suggestions")
    public ResponseEntity<ProductSuggestionPageResponse> suggestProducts(
        @Valid @ModelAttribute KeywordRequest search,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            ProductSuggestionPageResponse.from(
                productService.suggestProducts(
                    search.keyword(),
                    pagination.page(),
                    pagination.size()
                ),
                pagination
            )
        );
    }

    @Operation(summary = "제품 상세 조회", description = "제품 ID 에 해당하는 제품의 상세 정보와 전체 성분을 조회한다.")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDetailResponse> findProductDetail(
        @Parameter(example = "101") @PathVariable Long productId
    ) {
        return ResponseEntity.ok(ProductDetailResponse.from(productService.findDetail(productId)));
    }
}
