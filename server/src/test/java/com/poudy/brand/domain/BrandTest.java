package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드")
class BrandTest {

    @Test
    @DisplayName("영문명과 이미지가 없으면 null로 둔다")
    void keepsMissingOptionalTextAsNull() {
        Brand brand = new Brand(1L, "닥터지", null, null);

        assertThat(brand.englishName()).isNull();
        assertThat(brand.imageUrl()).isNull();
    }

    @Test
    @DisplayName("영문명과 이미지가 있으면 그대로 둔다")
    void keepsOptionalText() {
        Brand brand = new Brand(1L, "닥터지", "Dr.G", "https://cdn.example.com/brands/1/image.png");

        assertThat(brand.englishName()).isEqualTo("Dr.G");
        assertThat(brand.imageUrl()).isEqualTo("https://cdn.example.com/brands/1/image.png");
    }
}
