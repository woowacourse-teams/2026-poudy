package com.poudy.shelf.controller.dto;

import com.poudy.product.controller.dto.MarkResponse;
import com.poudy.product.controller.dto.ProductSuggestionMatchResponse;
import com.poudy.product.domain.ProductSuggestion;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ShelfProductSuggestionResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "독도 토너") String name,
    @NotNull @Schema(example = "라운드랩") String brandName,
    @NotNull List<MarkResponse> marks,
    @NotNull @Schema(example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(example = "true") Boolean sensorySupported,
    @NotNull ProductSuggestionMatchResponse match) {

    public static ShelfProductSuggestionResponse from(ProductSuggestion matched) {
        return new ShelfProductSuggestionResponse(
            matched.id(),
            matched.name(),
            matched.brandName(),
            MarkResponse.forList(matched.marks()),
            matched.imageUrl(),
            matched.supportsSensory(),
            ProductSuggestionMatchResponse.from(matched)
        );
    }
}
