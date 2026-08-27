package com.poudy.productrequest.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductRegistrationRequest(
        @NotBlank(message = "INVALID_REQUEST_BODY") @Size(min = 1, max = MAX_PRODUCT_NAME_LENGTH, message = "INVALID_REQUEST_BODY") @Schema(description = "등록을 요청할 제품명", example = "레드 블레미쉬 클리어 수딩 크림") String productName,
        @Size(max = MAX_BRAND_NAME_LENGTH, message = "INVALID_REQUEST_BODY") @Schema(description = "브랜드명. 알 수 없으면 생략한다.", example = "닥터지", nullable = true) String brandName) {

    public static final int MAX_PRODUCT_NAME_LENGTH = 200;
    public static final int MAX_BRAND_NAME_LENGTH = 100;

    public ProductRegistrationRequest {
        productName = trim(productName);
        brandName = emptyToNull(trim(brandName));
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }

        return value.strip();
    }

    private static String emptyToNull(String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }

        return value;
    }
}
