package com.poudy.shelf.controller.dto;

import com.poudy.product.controller.dto.MarkResponse;
import com.poudy.product.domain.Product;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ShelfProductInfoResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "독도 토너") String name,
    @NotNull @Schema(example = "라운드랩") String brandName,
    @NotNull @Schema(description = "제품 표식, 없으면 빈 배열") List<MarkResponse> marks,
    @NotNull @Schema(example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(description = "수분감·유분감 평가 가능 여부. 향수·클렌징 제품은 false", example = "true") Boolean sensorySupported) {

    public static ShelfProductInfoResponse from(Product product) {
        return new ShelfProductInfoResponse(
            product.id(),
            product.name(),
            product.brand().koreanName(),
            MarkResponse.forList(product.marks()),
            product.imageUrl(),
            product.supportsSensory()
        );
    }
}
