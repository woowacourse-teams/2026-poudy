package com.poudy.banner.controller.dto;

import com.poudy.banner.domain.BannerTarget;
import com.poudy.curation.controller.dto.CurationProductLinkQueryResponse;
import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(oneOf = {
        CurationBannerTargetResponse.class,
        ProductListBannerTargetResponse.class,
        ExternalBannerTargetResponse.class}, discriminatorProperty = "type", discriminatorMapping = {
                @DiscriminatorMapping(value = "CURATION", schema = CurationBannerTargetResponse.class),
                @DiscriminatorMapping(value = "PRODUCT_LIST", schema = ProductListBannerTargetResponse.class),
                @DiscriminatorMapping(value = "EXTERNAL", schema = ExternalBannerTargetResponse.class)})
public sealed interface BannerTargetResponse permits CurationBannerTargetResponse, ProductListBannerTargetResponse,
    ExternalBannerTargetResponse {
    static BannerTargetResponse from(BannerTarget target) {
        return switch (target) {
            case BannerTarget.Curation curation -> new CurationBannerTargetResponse("CURATION", curation.curationId());
            case BannerTarget.ProductList products -> new ProductListBannerTargetResponse(
                "PRODUCT_LIST",
                CurationProductLinkQueryResponse.from(products.query())
            );
            case BannerTarget.External external -> new ExternalBannerTargetResponse("EXTERNAL", external.url());
        };
    }
}
