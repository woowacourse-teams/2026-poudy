package com.poudy.productrequest.controller.dto;

import com.poudy.productrequest.domain.ProductRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

public record ProductRegistrationRequest(
        @NotNull(message = "INVALID_REQUEST_BODY") @Schema(description = "등록을 요청할 제품명", example = "레드 블레미쉬 클리어 수딩 크림", minLength = 1, maxLength = ProductRequest.MAX_PRODUCT_NAME_LENGTH) String productName,
        @Schema(description = "브랜드명. 알 수 없으면 생략한다.", example = "닥터지", nullable = true, maxLength = ProductRequest.MAX_BRAND_NAME_LENGTH) String brandName) {

    @AssertTrue(message = "INVALID_REQUEST_BODY")
    @Schema(hidden = true)
    public boolean hasValidNames() {
        return ProductRequest.hasValidNames(productName, brandName);
    }
}
