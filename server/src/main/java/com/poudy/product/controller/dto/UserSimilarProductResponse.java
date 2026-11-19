package com.poudy.product.controller.dto;

import com.poudy.product.domain.MyFilteredSimilarProduct;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UserSimilarProductResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "false") Boolean containsMyFilterIngredient,
    @NotNull @Schema(description = "유사 제품 목록 응답과 같은 값. 기준 구성품과 대상 구성품에 함께 든 성분군. 글리세린·빠른 제외 6종·주의 성분군(코드가 _CAUTION 으로 끝남)은 빼고, 기준 제품과 같은 카테고리에서 그 성분군을 가진 제품 수가 적은 순서로 최대 2개. 없으면 빈 배열") List<SharedIngredientGroupResponse> sharedIngredientGroups) {

    public static List<UserSimilarProductResponse> from(List<MyFilteredSimilarProduct> products) {
        return products.stream()
            .map(
                product -> new UserSimilarProductResponse(
                    product.productId(),
                    product.containsMyFilterIngredient(),
                    SharedIngredientGroupResponse.listOf(product.sharedIngredientGroups())
                )
            )
            .toList();
    }
}
