package com.poudy.brand.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.ProductCountsByCategory;
import com.poudy.product.domain.Products;
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
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        BrandCounts brandCounts = new BrandCounts(Map.of(1L, 3L));
        given(brandRepository.findAll()).willReturn(brands);
        given(productRepository.findBrandCounts()).willReturn(brandCounts);
        BrandService brandService = new BrandService(brandRepository, productRepository, categoryRepository);

        assertThat(brandService.findBrands()).isSameAs(brands);
        assertThat(brandService.findBrandCounts()).isSameAs(brandCounts);
    }

    @Test
    @DisplayName("ID에 해당하는 브랜드를 조회한다")
    void findsBrandById() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        given(brandRepository.findById(1L)).willReturn(Optional.of(drG));
        BrandService brandService = new BrandService(brandRepository, productRepository, categoryRepository);

        assertThat(brandService.findBrand(1L)).isEqualTo(drG);
    }

    @Test
    @DisplayName("ID에 해당하는 브랜드가 없으면 브랜드 없음 예외를 던진다")
    void rejectsUnknownBrand() {
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        given(brandRepository.findById(999L)).willReturn(Optional.empty());
        BrandService brandService = new BrandService(brandRepository, productRepository, categoryRepository);

        assertThatThrownBy(() -> brandService.findBrand(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .extracting(exception -> ((ResourceNotFoundException) exception).code())
                .isEqualTo(ErrorCode.BRAND_NOT_FOUND);
    }

    @Test
    @DisplayName("브랜드 정보와 제품이 속한 카테고리 계층을 조회한다")
    void findsBrandDetailWithCategories() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Category toner = new Category(2L, 1L, "토너", 1);
        Category serum = new Category(3L, 1L, "세럼", 1);
        Categories categories = Categories.from(List.of(skinCare, toner, serum));
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        given(brandRepository.findById(1L)).willReturn(Optional.of(drG));
        given(categoryRepository.findAll()).willReturn(categories);
        Products products = mock(Products.class);
        ProductCountsByCategory productCounts = mock(ProductCountsByCategory.class);
        given(productCounts.countOf(skinCare)).willReturn(2L);
        given(productCounts.countOf(toner)).willReturn(2L);
        given(productRepository.findAll()).willReturn(products);
        given(products.countsByCategoryInBrand(1L)).willReturn(productCounts);
        BrandService brandService = new BrandService(brandRepository, productRepository, categoryRepository);

        BrandDetail detail = brandService.findDetail(1L);

        assertThat(detail.brand()).isEqualTo(drG);
        assertThat(detail.categories()).containsExactly(skinCare);
        assertThat(detail.childrenOf(skinCare)).containsExactly(toner);
        assertThat(detail.productCountOf(skinCare)).isEqualTo(2L);
    }

    @Test
    @DisplayName("브랜드 제품이 없으면 빈 카테고리 목록을 조회한다")
    void findsEmptyCategoriesForBrandWithoutProducts() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Category toner = new Category(2L, 1L, "토너", 1);
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        given(brandRepository.findById(1L)).willReturn(Optional.of(drG));
        Categories categories = Categories.from(List.of(skinCare, toner));
        given(categoryRepository.findAll()).willReturn(categories);
        Products products = mock(Products.class);
        ProductCountsByCategory productCounts = mock(ProductCountsByCategory.class);
        given(productRepository.findAll()).willReturn(products);
        given(products.countsByCategoryInBrand(1L)).willReturn(productCounts);
        BrandService brandService = new BrandService(brandRepository, productRepository, categoryRepository);

        assertThat(brandService.findDetail(1L).categories()).isEmpty();
    }
}
