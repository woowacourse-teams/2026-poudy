package com.poudy.brand.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 서비스")
class BrandServiceTest {

    @Test
    @DisplayName("브랜드를 전체 제품 수와 함께 조회한다")
    void findsBrandsWithProductCounts() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        Brand medicube = new Brand(2L, "메디큐브", null, null);
        Brands brands = new Brands(List.of(medicube, drG));
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        given(brandRepository.findAll()).willReturn(brands);
        given(productRepository.countByBrandId()).willReturn(Map.of(1L, 3L));
        BrandService brandService = new BrandService(brandRepository, productRepository);

        BrandCounts brandCounts = brandService.findBrands();

        assertThat(brandCounts.brands()).containsExactly(drG, medicube);
        assertThat(brandCounts.productCountOf(drG)).isEqualTo(3L);
        assertThat(brandCounts.productCountOf(medicube)).isZero();
    }
}
