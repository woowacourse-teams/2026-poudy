package com.poudy.product.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.product.service.ProductQuery;
import com.poudy.search.validation.ValidSearchKeyword;
import com.poudy.skintype.domain.SkinType;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Objects;
import org.hibernate.validator.constraints.UniqueElements;

public record ProductFilterRequest(
    @Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL) @ValidSearchKeyword @Schema(description = "제품명 또는 브랜드명 검색어", example = "토너", maxLength = ValidSearchKeyword.MAX_LENGTH) String keyword,
    @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<@NotNull Long> categoryIds,
    @UniqueElements @ArraySchema(schema = @Schema(example = "12"), uniqueItems = true) List<@NotNull Long> brandIds,
    @UniqueElements @ArraySchema(schema = @Schema(example = "3"), uniqueItems = true) List<@NotNull @Min(0) @Max(3) Integer> moistureLevel,
    @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<@NotNull @Min(0) @Max(3) Integer> oilLevel,
    @UniqueElements @ArraySchema(schema = @Schema(example = "1012"), uniqueItems = true) List<@NotNull Long> includeIngredientIds,
    @UniqueElements @ArraySchema(schema = @Schema(example = "3551"), uniqueItems = true) List<@NotNull Long> excludeIngredientIds,
    @UniqueElements @ArraySchema(schema = @Schema(description = "빠른 제외 성분군. 이 성분군에 속한 성분을 하나라도 포함하면 제외한다", example = "HARSH_PRESERVATIVES"), uniqueItems = true) List<@NotNull ExcludeCode> excludeCodes,
    @Schema(description = "선택적인 단일 피부타입. 기존 필터와 AND로 결합한다. 빈 값은 미지정으로 처리하고 반복 전달 시 첫 값을 사용한다", example = "DRY") SkinType skinType) {

    public ProductFilterRequest {
        categoryIds = emptyIfMissing(categoryIds);
        brandIds = emptyIfMissing(brandIds);
        moistureLevel = emptyIfMissing(moistureLevel);
        oilLevel = emptyIfMissing(oilLevel);
        includeIngredientIds = emptyIfMissing(includeIngredientIds);
        excludeIngredientIds = emptyIfMissing(excludeIngredientIds);
        excludeCodes = emptyIfMissing(excludeCodes);
    }

    private static <T> List<T> emptyIfMissing(List<T> values) {
        return Objects.requireNonNullElse(values, List.of());
    }

    public ProductQuery toQuery() {
        return new ProductQuery(
            keyword,
            categoryIds,
            brandIds,
            moistureLevel,
            oilLevel,
            includeIngredientIds,
            excludeIngredientIds,
            excludeCodes,
            skinType
        );
    }
}
