package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductPart;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPartResponse(
    @NotNull @Schema(example = "473") Long id,
    @Schema(example = "아쿠아 세럼", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String name,
    @NotNull List<ProductIngredientResponse> ingredients,
    @Schema(description = "배포 전환용 구 응답. #1009 최종 전환 후 제거", deprecated = true, requiredMode = Schema.RequiredMode.NOT_REQUIRED) List<SkinEffectGroupResponse> skinEffectGroups,
    @Schema(description = "고민별 성분. 구 서버 응답과의 호환을 위해 전환 중에만 선택 필드", requiredMode = Schema.RequiredMode.NOT_REQUIRED) List<ConcernGroupResponse> concernGroups,
    @NotNull List<ExcludeGroupResponse> excludeGroups) {

    public static ProductPartResponse from(ProductDetail detail) {
        ProductPart part = detail.selectedPart();
        if (part == null) {
            return null;
        }

        return new ProductPartResponse(
            part.id(),
            part.name(),
            ProductIngredientResponse.from(part.ingredients().values(), detail),
            SkinEffectGroupResponse.from(part.skinEffectGroups(), detail.ingredientGroups(), part.ingredients()),
            ConcernGroupResponse.from(part.concernGroups(detail.ingredientGroups()), part.ingredients()),
            ExcludeGroupResponse.from(detail.excludeCodes(), part)
        );
    }
}
