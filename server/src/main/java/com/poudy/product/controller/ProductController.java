package com.poudy.product.controller;

import com.poudy.common.dto.KeywordRequest;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.product.controller.dto.ProductCountResponse;
import com.poudy.product.controller.dto.ProductDetailResponse;
import com.poudy.product.controller.dto.ProductFilterRequest;
import com.poudy.product.controller.dto.ProductPageResponse;
import com.poudy.product.controller.dto.ProductSortRequest;
import com.poudy.product.controller.dto.ProductSuggestionPageResponse;
import com.poudy.product.controller.dto.RelatedKeywordsResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품", description = "제품 조회 API")
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @Operation(summary = "제품 조회", description = "제품명·브랜드명·속성값·마크 이름 검색어와 필터 조건에 해당하는 제품 목록을 조회한다. "
        + "검색어의 모든 조건은 같은 제품에서 만족해야 한다. "
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

    @Operation(summary = "연관검색어 조회", description = "제품 검색 결과의 상위 제품을 같은 순서로 최대 5개 조회한다. "
        + "제품명에 검색어가 없으면 일치한 브랜드명이나 배지·속성값 이름을 제품명 앞에 붙인다. "
        + "오타 교정은 제품 검색과 같다. 검색어 길이 상한을 넘는 문구는 제외한다. match는 keyword에서 일치한 UTF-16 반열림 구간이다.")
    @GetMapping("/related-keywords")
    public ResponseEntity<RelatedKeywordsResponse> relatedKeywords(@Valid @ModelAttribute KeywordRequest search) {
        return ResponseEntity.ok(RelatedKeywordsResponse.from(productService.relatedKeywords(search.keyword())));
    }

    @Operation(summary = "제품 검색 제안 조회", description = "제품명·브랜드명·속성값·마크 이름 검색어의 모든 조건을 만족하는 제품을 "
        + "페이지 단위로 조회한다. match 는 실제로 일치한 필드의 원문과 그 원문을 기준으로 한 "
        + "UTF-16 반열림 구간을 제공한다. pagination.totalElements 는 페이지가 아니라 검색어에 해당하는 제품 전체를 센 값이다.")
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

    @Operation(summary = "제품 상세 조회", description = "제품 ID 에 해당하는 제품의 상세 정보를 조회한다. "
        + "productParts 는 모든 구성품의 요약이고, selectedPart 는 partId 로 고른 구성품의 전체 성분과 판정이다. "
        + "partId 가 없으면 표시 순서가 가장 앞선 구성품을 고른다.")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDetailResponse> findProductDetail(
        @Parameter(example = "101") @PathVariable Long productId,
        @Parameter(example = "473") @RequestParam(required = false) Long partId
    ) {
        return ResponseEntity.ok(ProductDetailResponse.from(productService.findDetail(productId, partId)));
    }
}
