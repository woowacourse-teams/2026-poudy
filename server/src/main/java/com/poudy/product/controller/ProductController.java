package com.poudy.product.controller;

import com.poudy.brand.controller.dto.BrandSummaryResponse;
import com.poudy.category.controller.dto.CategoryPathResponse;
import com.poudy.category.controller.dto.CategorySummaryResponse;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.ingredient.controller.dto.EffectResponse;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.product.controller.dto.BenefitResponse;
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

    private static final BrandSummaryResponse SAMPLE_BRAND = new BrandSummaryResponse(
            12L,
            "브랜드 이름",
            "https://cdn.example.com/brands/12/logo.png");
    private static final List<ProductResponse> SAMPLE_PRODUCTS = List.of(sampleProduct(101L));

    @Operation(summary = "제품 조회", description = "검색어와 필터 조건에 해당하는 제품 목록을 조회한다.")
    @GetMapping
    public ResponseEntity<ProductPageResponse> findProducts(
            @Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductSortRequest sort,
            @Valid @ModelAttribute PaginationRequest pagination) {
        IngredientFilter ingredientFilter = ingredientFilterOf(filter);

        return ResponseEntity.ok(
                new ProductPageResponse(SAMPLE_PRODUCTS, PaginationResponse.of(pagination, SAMPLE_PRODUCTS.size())));
    }

    @Operation(summary = "제품 필터 결과 개수 조회", description = "필터 조건에 해당하는 제품 개수를 조회한다. 목록과 같은 판정 규칙을 쓴다.")
    @GetMapping("/count")
    public ResponseEntity<ProductCountResponse> countProducts(@Valid @ModelAttribute ProductFilterRequest filter) {
        IngredientFilter ingredientFilter = ingredientFilterOf(filter);

        return ResponseEntity.ok(new ProductCountResponse((long) SAMPLE_PRODUCTS.size()));
    }

    @Operation(summary = "제품 간단 조회", description = "제품 ID 에 해당하는 기본 정보를 조회한다. 제품 목록 항목과 같은 형태다.")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductResponse> findProduct(@Parameter(example = "101") @PathVariable Long productId) {
        return ResponseEntity.ok(sampleProduct(productId));
    }

    @Operation(summary = "제품 상세 조회", description = "제품 ID 에 해당하는 제품의 상세 정보와 전체 성분을 조회한다.")
    @GetMapping("/detail/{productId}")
    public ResponseEntity<ProductDetailResponse> findProductDetail(
            @Parameter(example = "101") @PathVariable Long productId) {
        return ResponseEntity.ok(sampleProductDetail(productId));
    }

    private IngredientFilter ingredientFilterOf(ProductFilterRequest filter) {
        return new IngredientFilter(filter.includeIngredientIds(), filter.excludeIngredientIds());
    }

    private static ProductResponse sampleProduct(Long id) {
        return new ProductResponse(
                id,
                "스킨케어 이름",
                SAMPLE_BRAND,
                "https://cdn.example.com/products/" + id + ".png",
                18000L,
                new BigDecimal("200"),
                "ml");
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
                        new ProductVariantResponse(1L, 18000L, new BigDecimal("200"), "ml"),
                        new ProductVariantResponse(2L, 27000L, new BigDecimal("300"), "ml")),
                3,
                1,
                List.of(new BenefitResponse(1L, "보습", "#4CAF50", List.of(1001L, 1005L))),
                List.of(
                        new ProductIngredientResponse(1001L, "정제수", "Water", List.of()),
                        new ProductIngredientResponse(
                                1005L,
                                "글리세린",
                                "Glycerin",
                                List.of(new EffectResponse(1L, "보습", "#4CAF50")))),
                List.of(ExcludeCode.PARABEN_7, ExcludeCode.MINERAL_OIL));
    }
}
