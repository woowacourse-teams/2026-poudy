package com.poudy.product.controller;

import com.poudy.common.dto.KeywordRequest;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.product.controller.dto.ProductCountResponse;
import com.poudy.product.controller.dto.ProductDetailResponse;
import com.poudy.product.controller.dto.ProductFilterRequest;
import com.poudy.product.controller.dto.ProductPageResponse;
import com.poudy.product.controller.dto.ProductSortRequest;
import com.poudy.product.controller.dto.ProductSuggestionListResponse;
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

    private static final String KEYWORD = ProductFilterRequest.KEYWORD;
    private static final String FIND_PRODUCTS = "findProducts";
    private static final String PRODUCTS_SUMMARY = "제품 조회";
    private static final String PRODUCTS_DESCRIPTION = "검색어 또는 필터 조건에 해당하는 제품 목록을 조회한다. "
            + "keyword 와 필터 조건은 한쪽만 보낼 수 있고, 함께 보내면 400 을 반환한다. " + "sort 와 페이지 조건은 양쪽 모두에 쓴다.";
    private static final String COUNT_PATH = "/count";
    private static final String COUNT_SUMMARY = "제품 조회 결과 개수 조회";
    private static final String COUNT_DESCRIPTION = "검색어와 필터 조건에 해당하는 제품 개수를 조회한다. "
            + "목록과 달리 keyword 와 필터 조건을 함께 보낼 수 있다.";
    private static final String SUGGESTIONS_PATH = "/suggestions";

    private final ExcludeCodeIngredients excludeCodeIngredients;

    public ProductController(ExcludeCodeIngredients excludeCodeIngredients) {
        this.excludeCodeIngredients = excludeCodeIngredients;
    }

    @Operation(operationId = FIND_PRODUCTS, summary = PRODUCTS_SUMMARY, description = PRODUCTS_DESCRIPTION)
    @GetMapping(params = KEYWORD)
    public ResponseEntity<ProductPageResponse> searchProducts(
            @Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductSortRequest sort,
            @Valid @ModelAttribute PaginationRequest pagination) {
        filter.validateSearchOnly();

        return ResponseEntity.ok(ProductPageResponse.sample(pagination));
    }

    @Operation(operationId = FIND_PRODUCTS, summary = PRODUCTS_SUMMARY, description = PRODUCTS_DESCRIPTION)
    @GetMapping(params = "!" + KEYWORD)
    public ResponseEntity<ProductPageResponse> findProducts(
            @Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductSortRequest sort,
            @Valid @ModelAttribute PaginationRequest pagination) {
        filter.validateIngredientFilter(excludeCodeIngredients);

        return ResponseEntity.ok(ProductPageResponse.sample(pagination));
    }

    @Operation(summary = COUNT_SUMMARY, description = COUNT_DESCRIPTION)
    @GetMapping(COUNT_PATH)
    public ResponseEntity<ProductCountResponse> countProducts(@Valid @ModelAttribute ProductFilterRequest filter) {
        filter.validateIngredientFilter(excludeCodeIngredients);
        filter.validateKeywordIfPresent();

        return ResponseEntity.ok(ProductCountResponse.sample());
    }

    @Operation(summary = "제품 검색 제안 조회", description = "검색어에 해당하는 제품을 ID, 이름, 이미지와 브랜드 이름만 담아 조회한다.")
    @Parameter(name = KEYWORD, example = "토너")
    @GetMapping(SUGGESTIONS_PATH)
    public ResponseEntity<ProductSuggestionListResponse> suggestProducts(@Valid @ModelAttribute KeywordRequest search) {
        return ResponseEntity.ok(ProductSuggestionListResponse.sample());
    }

    @Operation(summary = "제품 상세 조회", description = "제품 ID 에 해당하는 제품의 상세 정보와 전체 성분을 조회한다.")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDetailResponse> findProductDetail(
            @Parameter(example = "101") @PathVariable Long productId) {
        return ResponseEntity.ok(ProductDetailResponse.sample(productId));
    }
}
