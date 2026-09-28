package com.poudy.brand.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.brand.domain.Brand;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("브랜드 저장소")
class BrandRepositoryTest {

    @Autowired
    private BrandRepository brandRepository;

    @Test
    @DisplayName("DB의 브랜드를 이름순 목록으로 조회한다")
    void findsAllBrands() {
        assertThat(brandRepository.findAll().sortedByName())
            .extracting(Brand::id, Brand::koreanName, Brand::englishName, Brand::imageUrl)
            .containsExactly(
                tuple(2L, "가 브랜드", null, null),
                tuple(3L, "나 브랜드", null, null),
                tuple(1L, "다 브랜드", "DA BRAND", null)
            );
    }

    @Test
    @DisplayName("ID에 해당하는 브랜드를 조회한다")
    void findsBrandById() {
        assertThat(brandRepository.findById(1L)).get()
            .extracting(Brand::koreanName, Brand::englishName)
            .containsExactly("다 브랜드", "DA BRAND");
        assertThat(brandRepository.findById(999L)).isEmpty();
    }
}
