package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public record ProductDetailResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "스킨케어 이름") String name,
    @NotNull BrandResponse brand,
    @NotNull List<CategoryPathResponse> categories,
    @NotNull @Schema(example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(example = """
        [{"id":1,"price":18000,"volumeValue":200,"volumeUnit":"ml","status":"active"},\
        {"id":2,"price":27000,"volumeValue":300,"volumeUnit":"ml","status":"active"}]\
        """) List<ProductVariantResponse> variants,
    @NotNull @DecimalMin("0") @DecimalMax("3") @Schema(example = "2.5", multipleOf = 0.5) Double moistureLevel,
    @NotNull @DecimalMin("0") @DecimalMax("3") @Schema(example = "1", multipleOf = 0.5) Double oilLevel,
    @NotNull @Schema(example = "false") Boolean sensitiveSkin,
    @NotNull List<ProductPartSummaryResponse> productParts,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) ProductPartResponse selectedPart,
    @NotNull @Schema(example = "2026-08-01T09:30:00+09:00") OffsetDateTime updatedAt) {

    public static ProductDetailResponse from(ProductDetail detail) {
        Product product = detail.product();

        return new ProductDetailResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            CategoryPathResponse.from(detail.categoryPath()),
            product.imageUrl(),
            ProductVariantResponse.from(product.variants().values()),
            product.moistureLevel(),
            product.oilLevel(),
            product.isForSensitiveSkin(),
            ProductPartSummaryResponse.from(detail),
            ProductPartResponse.from(detail),
            product.updatedAt()
        );
    }
}
