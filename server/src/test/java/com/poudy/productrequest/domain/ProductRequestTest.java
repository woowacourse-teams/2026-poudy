package com.poudy.productrequest.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 등록 요청")
class ProductRequestTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-08-23T12:34:56Z"), ZoneOffset.UTC);

    @Test
    @DisplayName("제품명과 브랜드명의 앞뒤 공백을 제거한다")
    void trimsNames() {
        ProductRequest request = ProductRequest.create("  제품 이름\n", "\t브랜드 이름  ", clock);

        assertThat(request.productName()).isEqualTo("제품 이름");
        assertThat(request.brandName()).isEqualTo("브랜드 이름");
    }

    @Test
    @DisplayName("공백뿐인 브랜드명은 생략한다")
    void normalizesBlankBrandNameToNull() {
        ProductRequest request = ProductRequest.create("제품", " \n ", clock);

        assertThat(request.brandName()).isNull();
    }

    @Test
    @DisplayName("정규화한 제품명이 비면 거절한다")
    void rejectsBlankProductName() {
        assertThatThrownBy(() -> ProductRequest.create(" \n ", null, clock))
                .isInstanceOf(InvalidProductRequestException.class);
    }

    @Test
    @DisplayName("정규화한 이름의 경계 길이는 허용하고 초과하면 거절한다")
    void validatesNormalizedBoundaryLength() {
        ProductRequest boundary = ProductRequest.create(
                " " + "가".repeat(ProductRequest.MAX_PRODUCT_NAME_LENGTH) + " ",
                "나".repeat(ProductRequest.MAX_BRAND_NAME_LENGTH),
                clock);

        assertThat(boundary.productName()).hasSize(ProductRequest.MAX_PRODUCT_NAME_LENGTH);
        assertThatThrownBy(
                () -> ProductRequest.create(
                        "가".repeat(ProductRequest.MAX_PRODUCT_NAME_LENGTH + 1),
                        null,
                        clock))
                .isInstanceOf(InvalidProductRequestException.class);
        assertThatThrownBy(
                () -> ProductRequest.create(
                        "제품",
                        "나".repeat(ProductRequest.MAX_BRAND_NAME_LENGTH + 1),
                        clock))
                .isInstanceOf(InvalidProductRequestException.class);
    }
}
