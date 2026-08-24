package com.poudy.brand.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
        BrandCounts brandCounts = new BrandCounts(Map.of(1L, 3L));
        given(brandRepository.findAll()).willReturn(brands);
        given(productRepository.findBrandCounts()).willReturn(brandCounts);
        BrandService brandService = new BrandService(brandRepository, productRepository);

        assertThat(brandService.findBrands()).isSameAs(brands);
        assertThat(brandService.findBrandCounts()).isSameAs(brandCounts);
    }

    @Test
    @DisplayName("ID에 해당하는 브랜드를 조회한다")
    void findsBrandById() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        given(brandRepository.findById(1L)).willReturn(Optional.of(drG));
        BrandService brandService = new BrandService(brandRepository, productRepository);

        assertThat(brandService.findBrand(1L)).isEqualTo(drG);
    }

    @Test
    @DisplayName("ID에 해당하는 브랜드가 없으면 브랜드 없음 예외를 던진다")
    void rejectsUnknownBrand() {
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        given(brandRepository.findById(999L)).willReturn(Optional.empty());
        BrandService brandService = new BrandService(brandRepository, productRepository);

        assertThatThrownBy(() -> brandService.findBrand(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .extracting(exception -> ((ResourceNotFoundException) exception).code())
                .isEqualTo(ErrorCode.BRAND_NOT_FOUND);
    }

}
