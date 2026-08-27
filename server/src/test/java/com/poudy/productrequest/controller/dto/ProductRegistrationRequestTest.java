package com.poudy.productrequest.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 등록 요청 본문")
class ProductRegistrationRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("제품명과 브랜드명의 앞뒤 공백을 제거한다")
    void trimsNames() {
        ProductRegistrationRequest body = new ProductRegistrationRequest("  제품 이름\n", "\t브랜드 이름  ");

        assertThat(body.productName()).isEqualTo("제품 이름");
        assertThat(body.brandName()).isEqualTo("브랜드 이름");
        assertThat(validator.validate(body)).isEmpty();
    }

    @Test
    @DisplayName("공백뿐인 브랜드명은 생략으로 정규화한다")
    void normalizesBlankBrandNameToNull() {
        ProductRegistrationRequest body = new ProductRegistrationRequest("제품", " \n ");

        assertThat(body.brandName()).isNull();
        assertThat(validator.validate(body)).isEmpty();
    }

    @Test
    @DisplayName("trim 이후 제품명이 비면 거절한다")
    void rejectsBlankProductNameAfterTrim() {
        ProductRegistrationRequest body = new ProductRegistrationRequest(" \n ", null);

        assertThat(validator.validate(body)).isNotEmpty();
    }

    @Test
    @DisplayName("trim 이후 경계 길이 이름을 허용하고 초과하면 거절한다")
    void validatesTrimmedBoundaryLength() {
        ProductRegistrationRequest boundary = new ProductRegistrationRequest(
            " " + "가".repeat(ProductRegistrationRequest.MAX_PRODUCT_NAME_LENGTH) + " ",
            "나".repeat(ProductRegistrationRequest.MAX_BRAND_NAME_LENGTH)
        );
        ProductRegistrationRequest tooLong = new ProductRegistrationRequest(
            "가".repeat(ProductRegistrationRequest.MAX_PRODUCT_NAME_LENGTH + 1),
            "나".repeat(ProductRegistrationRequest.MAX_BRAND_NAME_LENGTH + 1)
        );

        assertThat(validator.validate(boundary)).isEmpty();
        assertThat(validator.validate(tooLong)).hasSize(2);
    }
}
