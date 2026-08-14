package com.poudy.product.controller;

import com.poudy.brand.controller.dto.BrandSummaryResponse;
import com.poudy.category.controller.dto.CategoryPathResponse;
import com.poudy.category.controller.dto.CategorySummaryResponse;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.controller.dto.EffectResponse;
import com.poudy.product.controller.dto.BenefitResponse;
import com.poudy.product.controller.dto.DisclosedAmountResponse;
import com.poudy.product.controller.dto.ProductCountResponse;
import com.poudy.product.controller.dto.ProductDetailResponse;
import com.poudy.product.controller.dto.ProductFilterRequest;
import com.poudy.product.controller.dto.ProductIngredientResponse;
import com.poudy.product.controller.dto.ProductPageResponse;
import com.poudy.product.controller.dto.ProductResponse;
import com.poudy.product.controller.dto.ProductSortRequest;
import com.poudy.product.controller.dto.ProductVariantResponse;
import com.poudy.product.domain.IngredientFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
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

    private static final String KEYWORD = ProductFilterRequest.KEYWORD;
    private static final String FIND_PRODUCTS = "findProducts";
    private static final String PRODUCTS_SUMMARY = "제품 조회";
    private static final String PRODUCTS_DESCRIPTION = "검색어 또는 필터 조건에 해당하는 제품 목록을 조회한다. "
            + "keyword 와 필터 조건은 한쪽만 보낼 수 있고, 함께 보내면 400 을 반환한다. " + "sort 와 페이지 조건은 양쪽 모두에 쓴다.";
    private static final String COUNT_PATH = "/count";
    private static final String COUNT_SUMMARY = "제품 조회 결과 개수 조회";
    private static final String COUNT_DESCRIPTION = "검색어와 필터 조건에 해당하는 제품 개수를 조회한다. "
            + "목록과 달리 keyword 와 필터 조건을 함께 보낼 수 있다.";

    private static final BrandSummaryResponse SAMPLE_BRAND = new BrandSummaryResponse(
            12L,
            "브랜드 이름",
            "https://cdn.example.com/brands/12/logo.png");
    private static final List<ProductResponse> SAMPLE_PRODUCTS = List.of(sampleProduct(101L));

    @Operation(operationId = FIND_PRODUCTS, summary = PRODUCTS_SUMMARY, description = PRODUCTS_DESCRIPTION)
    @GetMapping(params = KEYWORD)
    public ResponseEntity<ProductPageResponse> searchProducts(
            @Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductSortRequest sort,
            @Valid @ModelAttribute PaginationRequest pagination) {
        filter.validateSearchOnly();

        return ResponseEntity.ok(
                new ProductPageResponse(SAMPLE_PRODUCTS, PaginationResponse.of(pagination, SAMPLE_PRODUCTS.size())));
    }

    @Operation(operationId = FIND_PRODUCTS, summary = PRODUCTS_SUMMARY, description = PRODUCTS_DESCRIPTION)
    @GetMapping(params = "!" + KEYWORD)
    public ResponseEntity<ProductPageResponse> findProducts(
            @Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductSortRequest sort,
            @Valid @ModelAttribute PaginationRequest pagination) {
        validateIngredientFilter(filter);

        return ResponseEntity.ok(
                new ProductPageResponse(SAMPLE_PRODUCTS, PaginationResponse.of(pagination, SAMPLE_PRODUCTS.size())));
    }

    @Operation(summary = COUNT_SUMMARY, description = COUNT_DESCRIPTION)
    @GetMapping(COUNT_PATH)
    public ResponseEntity<ProductCountResponse> countProducts(@Valid @ModelAttribute ProductFilterRequest filter) {
        validateIngredientFilter(filter);

        return ResponseEntity.ok(new ProductCountResponse((long) SAMPLE_PRODUCTS.size()));
    }

    @Operation(summary = "제품 상세 조회", description = "제품 ID 에 해당하는 제품의 상세 정보와 전체 성분을 조회한다.")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDetailResponse> findProductDetail(
            @Parameter(example = "101") @PathVariable Long productId) {
        return ResponseEntity.ok(sampleProductDetail(productId));
    }

    private void validateIngredientFilter(ProductFilterRequest filter) {
        new IngredientFilter(filter.includeIngredientIds(), filter.excludeIngredientIds());
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

    private static ProductDetailResponse sampleProductDetail(Long id) {
        return new ProductDetailResponse(
                id,
                "스킨케어 이름",
                SAMPLE_BRAND,
                List.of(new CategoryPathResponse(1L, "스킨케어", new CategorySummaryResponse(7L, "토너"))),
                "https://cdn.example.com/products/" + id + ".png",
                18000L,
                new BigDecimal("200"),
                "ml",
                List.of(
                        new ProductVariantResponse(1L, 18000L, new BigDecimal("200"), "ml", "active"),
                        new ProductVariantResponse(2L, 27000L, new BigDecimal("300"), "ml", "active")),
                3,
                1,
                List.of(new BenefitResponse(1L, "보습", "#4CAF50", List.of(1001L, 1005L))),
                List.of(
                        new ProductIngredientResponse(1001L, "정제수", "Water", List.of(), null),
                        new ProductIngredientResponse(
                                1005L,
                                "글리세린",
                                "Glycerin",
                                List.of(new EffectResponse(1L, "보습", "#4CAF50")),
                                new DisclosedAmountResponse("exact", new BigDecimal("10500"), "ppm"))),
                List.of(ExcludeCode.PARABEN_7, ExcludeCode.MINERAL_OIL));
    }
}
