package com.poudy.product.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.product.domain.ProductAttributeSelection;
import com.poudy.product.domain.ProductQuery;
import com.poudy.search.validation.ValidSearchKeyword;
import com.poudy.skintype.domain.SkinType;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Objects;
import org.hibernate.validator.constraints.UniqueElements;

public record ProductFilterRequest(
    @Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL) @ValidSearchKeyword @Schema(description = "제품명 또는 브랜드명 검색어", example = "토너", maxLength = ValidSearchKeyword.MAX_LENGTH) String keyword,
    @UniqueElements @ArraySchema(schema = @Schema(example = "1"), uniqueItems = true) List<@NotNull Long> categoryIds,
    @UniqueElements @ArraySchema(schema = @Schema(example = "12"), uniqueItems = true) List<@NotNull Long> brandIds,
    @UniqueElements @ArraySchema(schema = @Schema(example = "2.5", minimum = "0", maximum = "3", multipleOf = 0.5), uniqueItems = true) List<@NotNull Double> moistureLevel,
    @UniqueElements @ArraySchema(schema = @Schema(example = "1", minimum = "0", maximum = "3", multipleOf = 0.5), uniqueItems = true) List<@NotNull Double> oilLevel,
    @UniqueElements @ArraySchema(schema = @Schema(example = "1012"), uniqueItems = true) List<@NotNull Long> includeIngredientIds,
    @UniqueElements @ArraySchema(schema = @Schema(example = "3551"), uniqueItems = true) List<@NotNull Long> excludeIngredientIds,
    @UniqueElements @ArraySchema(schema = @Schema(description = "빠른 제외 성분군. 이 성분군에 속한 성분을 하나라도 포함하면 제외한다", example = "HARSH_PRESERVATIVES"), uniqueItems = true) List<@NotNull ExcludeCode> excludeCodes,
    @UniqueElements @ArraySchema(schema = @Schema(example = "CERAMIDES"), uniqueItems = true) List<@NotBlank String> includeGroupCodes,
    @UniqueElements @ArraySchema(schema = @Schema(example = "CERAMIDES"), uniqueItems = true) List<@NotBlank String> excludeGroupCodes,
    @UniqueElements @ArraySchema(arraySchema = @Schema(description = "선택할 피부 타입. skinType=DRY&skinType=OILY처럼 반복 전달하며 민감성과 함께 OR로 결합한다. 빈 값은 미지정으로 처리한다"), schema = @Schema(example = "DRY"), uniqueItems = true) List<@NotNull SkinType> skinType,
    @Schema(description = "true이면 민감성 피부용 제품도 선택한 피부 타입과 OR로 포함한다. false 또는 생략은 민감성을 선택하지 않은 것으로 처리한다", example = "true") Boolean sensitiveSkin,
    @Size(min = 1) @UniqueElements @ArraySchema(arraySchema = @Schema(description = "속성코드:값코드. attributes=UV_FILTER_TYPE:MINERAL&attributes=WASHABILITY:EASY_WASH처럼 반복 전달. 같은 속성은 OR, 서로 다른 속성은 AND"), schema = @Schema(example = "UV_FILTER_TYPE:MINERAL"), uniqueItems = true) List<@NotBlank String> attributes,
    @Schema(example = "true", defaultValue = "false") Boolean myFilter) {

    public ProductFilterRequest {
        categoryIds = emptyIfMissing(categoryIds);
        brandIds = emptyIfMissing(brandIds);
        moistureLevel = emptyIfMissing(moistureLevel);
        oilLevel = emptyIfMissing(oilLevel);
        includeIngredientIds = emptyIfMissing(includeIngredientIds);
        excludeIngredientIds = emptyIfMissing(excludeIngredientIds);
        excludeCodes = emptyIfMissing(excludeCodes);
        includeGroupCodes = emptyIfMissing(includeGroupCodes);
        excludeGroupCodes = emptyIfMissing(excludeGroupCodes);
        skinType = emptyIfMissing(skinType);
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
            includeGroupCodes,
            excludeGroupCodes,
            skinType,
            Boolean.TRUE.equals(sensitiveSkin),
            emptyIfMissing(attributes).stream().map(ProductAttributeSelection::parse).toList()
        );
    }
}
