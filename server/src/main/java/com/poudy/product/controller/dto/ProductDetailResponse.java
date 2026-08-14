package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.category.controller.dto.CategoryPathResponse;
import com.poudy.excludecode.domain.ExcludeCode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record ProductDetailResponse(
        @NotNull @Schema(description = "제품 ID", example = "101") Long id,
        @NotNull @Schema(description = "제품명", example = "스킨케어 이름") String name,
        @NotNull @Schema(description = "브랜드 정보") BrandResponse brand,
        @NotNull @Schema(description = "제품 카테고리 목록") List<CategoryPathResponse> categories,
        @NotNull @Schema(description = "제품 대표 이미지 URL", example = "https://cdn.example.com/products/101.png") String imageUrl,
        @NotNull @Schema(description = "제품 가격 (원)", example = "18000") Long price,
        @NotNull @Schema(description = "제품 용량 값", example = "200") BigDecimal volumeValue,
        @NotNull @Schema(description = "제품 용량 단위", example = "ml") String volumeUnit,
        @NotNull @Schema(description = "같은 제품의 용량 옵션 전체. 위 가격과 용량은 대표 옵션 값이다", example = """
                [{"id":1,"price":18000,"volumeValue":200,"volumeUnit":"ml","status":"active"},\
                {"id":2,"price":27000,"volumeValue":300,"volumeUnit":"ml","status":"active"}]\
                """) List<ProductVariantResponse> variants,
        @NotNull @Min(0) @Max(3) @Schema(description = "수분감 단계 (0~3)", example = "3") Integer moistureLevel,
        @NotNull @Min(0) @Max(3) @Schema(description = "유분감 단계 (0~3)", example = "1") Integer oilLevel,
        @NotNull @Schema(description = "효과별 성분 그룹") List<BenefitResponse> benefits,
        @NotNull @Schema(description = "표시 순서대로 정렬된 전체 성분") List<ProductIngredientResponse> ingredients,
        @NotNull @Schema(description = "이 제품이 포함하지 않는 성분군 (프리 뱃지)") List<ExcludeCode> freeOfCodes) {
}
