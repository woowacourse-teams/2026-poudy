package com.poudy.product.controller;

import com.poudy.brand.dto.BrandSummaryResponse;
import com.poudy.category.dto.CategorySummaryResponse;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.dto.EffectResponse;
import com.poudy.product.dto.BenefitResponse;
import com.poudy.product.dto.ProductCountResponse;
import com.poudy.product.dto.ProductDetailResponse;
import com.poudy.product.dto.ProductFilterRequest;
import com.poudy.product.dto.ProductIngredientResponse;
import com.poudy.product.dto.ProductPageRequest;
import com.poudy.product.dto.ProductPageResponse;
import com.poudy.product.dto.ProductResponse;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final BrandSummaryResponse SAMPLE_BRAND = new BrandSummaryResponse(12L, "브랜드명",
            "https://cdn.example.com/brands/12/logo.png");
    private static final ProductResponse SAMPLE_PRODUCT = new ProductResponse(101L, "수분 진정 토너", SAMPLE_BRAND,
            "https://cdn.example.com/products/101.png", 18000L, new BigDecimal("200"), "ml");
    private static final ProductDetailResponse SAMPLE_PRODUCT_DETAIL = new ProductDetailResponse(101L, "수분 진정 토너",
            SAMPLE_BRAND, List.of(new CategorySummaryResponse(3L, "스킨케어"), new CategorySummaryResponse(7L, "토너")),
            "https://cdn.example.com/products/101.png", 18000L, new BigDecimal("200"), "ml", 3, 1,
            List.of(new BenefitResponse(1L, "보습", "#4CAF50", List.of(1001L, 1005L))),
            List.of(new ProductIngredientResponse(1001L, "정제수", "Water", List.of()),
                    new ProductIngredientResponse(1005L, "글리세린", "Glycerin",
                            List.of(new EffectResponse(1L, "보습", "#4CAF50")))),
            List.of(ExcludeCode.PARABEN_7, ExcludeCode.MINERAL_OIL));

    @GetMapping
    public ResponseEntity<ProductPageResponse> findProducts(@Valid @ModelAttribute ProductFilterRequest filter,
            @Valid @ModelAttribute ProductPageRequest page) {
        return ResponseEntity.ok(new ProductPageResponse(List.of(SAMPLE_PRODUCT), page.page(), page.size(), false));
    }

    @GetMapping("/count")
    public ResponseEntity<ProductCountResponse> countProducts(@Valid @ModelAttribute ProductFilterRequest filter) {
        return ResponseEntity.ok(new ProductCountResponse(127L));
    }

    @ApiResponse(responseCode = "200", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(oneOf = {
            ProductDetailResponse.class, ProductResponse.class})))
    @GetMapping("/detail/{productId}")
    public ResponseEntity<Object> findProduct(@PathVariable Long productId,
            @RequestParam(defaultValue = "DETAIL") ProductView view) {
        if (view == ProductView.SIMPLE) {
            return ResponseEntity.ok(SAMPLE_PRODUCT);
        }
        return ResponseEntity.ok(SAMPLE_PRODUCT_DETAIL);
    }
}
