package com.poudy.brand.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.BrandProductCount;
import com.poudy.product.domain.BrandProductCounts;
import com.poudy.product.domain.CategoryProductCount;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
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
        Products products = mock(Products.class);
        List<BrandProductCount> productCounts = List.of(
                new BrandProductCount(drG, 3L),
                new BrandProductCount(medicube, 0L));
        given(brandRepository.findAll()).willReturn(brands);
        given(productRepository.findAll()).willReturn(products);
        given(products.productCountsByBrand(brands.sortedByName())).willReturn(productCounts);
        BrandService brandService = new BrandService(
                brandRepository,
                productRepository,
                Categories.from(List.of()));

        assertThat(brandService.findBrands())
                .extracting(BrandProductCount::id, BrandProductCount::productCount)
                .containsExactly(tuple(1L, 3L), tuple(2L, 0L));
    }

    @Test
    @DisplayName("브랜드와 해당 제품의 카테고리별 개수를 상세 정보로 조회한다")
    void findsBrandDetail() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Categories categories = Categories.from(List.of(skinCare));
        CategoryProductCount categoryProductCount = new CategoryProductCount(skinCare, 3L, List.of());
        BrandProductCounts productCounts = new BrandProductCounts(drG, List.of(categoryProductCount));
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        Products products = mock(Products.class);
        given(brandRepository.findById(1L)).willReturn(Optional.of(drG));
        given(productRepository.findAll()).willReturn(products);
        given(products.brandProductCountsOf(drG, categories)).willReturn(productCounts);
        BrandService brandService = new BrandService(brandRepository, productRepository, categories);

        assertThat(brandService.findBrandDetail(1L)).isSameAs(productCounts);
    }

    @Test
    @DisplayName("ID에 해당하는 브랜드가 없으면 제품을 조회하지 않고 브랜드 없음 예외를 던진다")
    void rejectsUnknownBrandBeforeFindingProducts() {
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        given(brandRepository.findById(999L)).willReturn(Optional.empty());
        BrandService brandService = new BrandService(
                brandRepository,
                productRepository,
                Categories.from(List.of()));

        assertThatThrownBy(() -> brandService.findBrandDetail(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .extracting(exception -> ((ResourceNotFoundException) exception).code())
                .isEqualTo(ErrorCode.BRAND_NOT_FOUND);
        verifyNoInteractions(productRepository);
    }
}
