package com.poudy.product.controller;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.category.controller.dto.CategoryPathResponse;
import com.poudy.category.controller.dto.CategorySummaryResponse;
import com.poudy.common.dto.KeywordRequest;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.product.controller.dto.DisclosedAmountResponse;
import com.poudy.product.controller.dto.ProductCountResponse;
import com.poudy.product.controller.dto.ProductDetailResponse;
import com.poudy.product.controller.dto.ProductFilterRequest;
import com.poudy.product.controller.dto.ProductIngredientResponse;
import com.poudy.product.controller.dto.ProductPageResponse;
import com.poudy.product.controller.dto.ProductResponse;
import com.poudy.product.controller.dto.ProductSortRequest;
import com.poudy.product.controller.dto.ProductSuggestionListResponse;
import com.poudy.product.controller.dto.ProductSuggestionResponse;
import com.poudy.product.controller.dto.ProductVariantResponse;
import com.poudy.product.controller.dto.SkinEffectGroupResponse;
import com.poudy.product.domain.IngredientFilter;
import com.poudy.tag.controller.dto.FormulationRoleResponse;
import com.poudy.tag.controller.dto.SkinEffectResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
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

    private final ExcludeCodeIngredients excludeCodeIngredients;

    public ProductController(ExcludeCodeIngredients excludeCodeIngredients) {
        this.excludeCodeIngredients = excludeCodeIngredients;
    }

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

    private static final BrandResponse SAMPLE_BRAND = new BrandResponse(
            12L,
            "브랜드 이름",
            "BRAND NAME",
            "https://cdn.example.com/brands/12/image.png");
    private static final List<ProductResponse> SAMPLE_PRODUCTS = List.of(sampleProduct(101L));
    private static final List<BrandResponse> SAMPLE_RESULT_BRANDS = List.of(SAMPLE_BRAND);
    private static final OffsetDateTime SAMPLE_UPDATED_AT = OffsetDateTime.parse("2026-08-01T09:30:00+09:00");

    @Operation(operationId = FIND_PRODUCTS, summary = PRODUCTS_SUMMARY, description = PRODUCTS_DESCRIPTION)
    @GetMapping(params = KEYWORD)
    public ResponseEntity<ProductPageResponse> searchProducts(
            @Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductSortRequest sort,
            @Valid @ModelAttribute PaginationRequest pagination) {
        filter.validateSearchOnly();

        return ResponseEntity.ok(
                new ProductPageResponse(
                        SAMPLE_PRODUCTS,
                        PaginationResponse.of(pagination, SAMPLE_PRODUCTS.size()),
                        SAMPLE_RESULT_BRANDS));
    }

    @Operation(operationId = FIND_PRODUCTS, summary = PRODUCTS_SUMMARY, description = PRODUCTS_DESCRIPTION)
    @GetMapping(params = "!" + KEYWORD)
    public ResponseEntity<ProductPageResponse> findProducts(
            @Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductSortRequest sort,
            @Valid @ModelAttribute PaginationRequest pagination) {
        validateIngredientFilter(filter);

        return ResponseEntity.ok(
                new ProductPageResponse(
                        SAMPLE_PRODUCTS,
                        PaginationResponse.of(pagination, SAMPLE_PRODUCTS.size()),
                        SAMPLE_RESULT_BRANDS));
    }

    @Operation(summary = COUNT_SUMMARY, description = COUNT_DESCRIPTION)
    @GetMapping(COUNT_PATH)
    public ResponseEntity<ProductCountResponse> countProducts(@Valid @ModelAttribute ProductFilterRequest filter) {
        validateIngredientFilter(filter);
        filter.validateKeywordIfPresent();

        return ResponseEntity.ok(new ProductCountResponse((long) SAMPLE_PRODUCTS.size()));
    }

    @Operation(summary = "제품 검색 제안 조회", description = "검색어에 해당하는 제품을 ID, 이름, 이미지와 브랜드 이름만 담아 조회한다.")
    @Parameter(name = KEYWORD, example = "토너")
    @GetMapping(SUGGESTIONS_PATH)
    public ResponseEntity<ProductSuggestionListResponse> suggestProducts(@Valid @ModelAttribute KeywordRequest search) {
        return ResponseEntity.ok(new ProductSuggestionListResponse(List.of(sampleSuggestion(101L))));
    }

    @Operation(summary = "제품 상세 조회", description = "제품 ID 에 해당하는 제품의 상세 정보와 전체 성분을 조회한다.")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDetailResponse> findProductDetail(
            @Parameter(example = "101") @PathVariable Long productId) {
        return ResponseEntity.ok(sampleProductDetail(productId));
    }

    private void validateIngredientFilter(ProductFilterRequest filter) {
        IngredientFilter.of(
                filter.includeIngredientIds(),
                filter.excludeIngredientIds(),
                excludeCodeIngredients.idsOf(filter.excludeCodes()));
    }

    private static ProductResponse sampleProduct(Long id) {
        return new ProductResponse(
                id,
                "스킨케어 이름",
                SAMPLE_BRAND,
                "https://cdn.example.com/products/" + id + ".png",
                18000L,
                new BigDecimal("200"),
                "ml",
                3,
                1);
    }

    private static ProductSuggestionResponse sampleSuggestion(Long id) {
        return new ProductSuggestionResponse(
                id,
                "스킨케어 이름",
                "https://cdn.example.com/products/" + id + ".png",
                SAMPLE_BRAND.name());
    }

    private static ProductDetailResponse sampleProductDetail(Long id) {
        return new ProductDetailResponse(
                id,
                "스킨케어 이름",
                SAMPLE_BRAND,
                List.of(new CategoryPathResponse(1L, "스킨케어", new CategorySummaryResponse(7L, "토너"))),
                "https://cdn.example.com/products/" + id + ".png",
                List.of(
                        new ProductVariantResponse(1L, 18000L, new BigDecimal("200"), "ml", "active"),
                        new ProductVariantResponse(2L, 27000L, new BigDecimal("300"), "ml", "active")),
                3,
                1,
                List.of(new SkinEffectGroupResponse(21L, "피부 장벽 관련", "#4CAF50", List.of(1005L))),
                List.of(
                        new ProductIngredientResponse(
                                1001L,
                                "정제수",
                                "Water",
                                List.of(new FormulationRoleResponse(3L, "용제")),
                                List.of(),
                                null),
                        new ProductIngredientResponse(
                                1005L,
                                "글리세린",
                                "Glycerin",
                                List.of(
                                        new FormulationRoleResponse(1L, "습윤제"),
                                        new FormulationRoleResponse(2L, "피부 컨디셔닝제")),
                                List.of(new SkinEffectResponse(21L, "피부 장벽 관련")),
                                new DisclosedAmountResponse("exact", new BigDecimal("10500"), "ppm"))),
                List.of(ExcludeCode.HARSH_PRESERVATIVES, ExcludeCode.CYCLIC_SILICONES),
                SAMPLE_UPDATED_AT);
    }
}
