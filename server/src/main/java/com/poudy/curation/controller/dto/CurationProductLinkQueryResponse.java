package com.poudy.curation.controller.dto;

import com.poudy.curation.domain.CurationProductLinkQuery;
import com.poudy.search.validation.ValidSearchKeyword;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CurationProductLinkQueryResponse(
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, maxLength = ValidSearchKeyword.MAX_LENGTH) String keyword,
    @NotNull @Size(max = CurationProductLinkQuery.MAX_VALUES) @ArraySchema(uniqueItems = true) List<@NotNull @Min(1) Long> brandIds,
    @NotNull @Size(max = CurationProductLinkQuery.MAX_VALUES) @ArraySchema(uniqueItems = true) List<@NotNull @Min(1) Long> categoryIds,
    @NotNull @Size(max = CurationProductLinkQuery.MAX_VALUES) @ArraySchema(uniqueItems = true) List<@NotNull @Min(1) Long> includeIngredientIds,
    @NotNull @Size(max = CurationProductLinkQuery.MAX_VALUES) @ArraySchema(uniqueItems = true) List<@NotBlank String> includeGroupCodes) {

    static CurationProductLinkQueryResponse from(CurationProductLinkQuery query) {
        return new CurationProductLinkQueryResponse(
            query.keyword(),
            query.brandIds(),
            query.categoryIds(),
            query.includeIngredientIds(),
            query.includeGroupCodes()
        );
    }
}
