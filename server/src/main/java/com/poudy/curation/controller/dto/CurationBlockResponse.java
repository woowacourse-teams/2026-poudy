package com.poudy.curation.controller.dto;

import com.poudy.curation.domain.CurationBlockContent;
import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(oneOf = {
        CurationImageBlockResponse.class,
        CurationProductsBlockResponse.class,
        CurationProductsByFilterBlockResponse.class}, discriminatorProperty = "type", discriminatorMapping = {
                @DiscriminatorMapping(value = "IMAGE", schema = CurationImageBlockResponse.class),
                @DiscriminatorMapping(value = "PRODUCTS", schema = CurationProductsBlockResponse.class),
                @DiscriminatorMapping(value = "PRODUCTS_BY_FILTER", schema = CurationProductsByFilterBlockResponse.class)
        })
public sealed interface CurationBlockResponse permits CurationImageBlockResponse, CurationProductsBlockResponse,
    CurationProductsByFilterBlockResponse {

    static CurationBlockResponse from(CurationBlockContent block) {
        return switch (block) {
            case CurationBlockContent.Image image -> new CurationImageBlockResponse(
                image.id(),
                "IMAGE",
                image.spacingTop(),
                image.spacingBottom(),
                image.imageUrl()
            );
            case CurationBlockContent.Products products -> new CurationProductsBlockResponse(
                products.id(),
                "PRODUCTS",
                products.spacingTop(),
                products.spacingBottom(),
                products.products().stream().map(CurationProductResponse::from).toList()
            );
            case CurationBlockContent.ProductsByFilter products -> new CurationProductsByFilterBlockResponse(
                products.id(),
                "PRODUCTS_BY_FILTER",
                products.spacingTop(),
                products.spacingBottom(),
                products.filters().stream().map(filter -> new CurationFilterResponse(filter.id(), filter.label()))
                    .toList(),
                products.products().stream().map(
                    item -> new CurationProductItemResponse(
                        CurationProductResponse.from(item.product()),
                        item.filterIds()
                    )
                ).toList()
            );
        };
    }
}
