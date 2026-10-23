package com.poudy.product.controller.dto;

import com.poudy.product.domain.MyFilteredSimilarProduct;
import com.poudy.product.domain.UnsuitableIngredients;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UserProductResponse(
    @NotNull @Schema(description = "저장함에 담았는지 여부") Boolean wishlisted,
    @NotNull @Schema(description = "선반에 담았는지 여부") Boolean shelved,
    @NotNull @Schema(example = "false") Boolean myFilterEmpty,
    @NotNull List<UnsuitableIngredientResponse> unsuitableIngredients,
    @NotNull List<UserSimilarProductResponse> similarProducts) {

    public static UserProductResponse of(
        boolean wishlisted,
        boolean shelved,
        UnsuitableIngredients unsuitable,
        List<MyFilteredSimilarProduct> similarProducts
    ) {
        return new UserProductResponse(
            wishlisted,
            shelved,
            unsuitable.myFilterEmpty(),
            UnsuitableIngredientResponse.from(unsuitable.values()),
            UserSimilarProductResponse.from(similarProducts)
        );
    }
}
