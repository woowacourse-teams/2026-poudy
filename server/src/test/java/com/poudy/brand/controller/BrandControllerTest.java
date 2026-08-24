package com.poudy.brand.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.brand.controller.dto.BrandDetailResponse;
import com.poudy.brand.controller.dto.BrandListResponse;
import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.service.BrandService;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.ProductCountsByCategory;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("브랜드 컨트롤러")
class BrandControllerTest {

    @Test
    @DisplayName("서비스에서 조회한 브랜드를 200 응답으로 반환한다")
    void findsBrands() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        BrandCounts brandCounts = new BrandCounts(new Brands(List.of(drG)), Map.of(1L, 3L));
        BrandService brandService = mock(BrandService.class);
        given(brandService.findBrands()).willReturn(brandCounts);
        BrandController controller = new BrandController(brandService);

        ResponseEntity<BrandListResponse> response = controller.findBrands();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(BrandListResponse.from(brandCounts));
        verify(brandService).findBrands();
    }

    @Test
    @DisplayName("서비스에서 조회한 브랜드 상세를 200 응답으로 반환한다")
    void findsBrandDetail() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Category toner = new Category(2L, 1L, "토너", 1);
        Categories categories = new Categories(List.of(skinCare, toner));
        ProductCountsByCategory productCounts = mock(ProductCountsByCategory.class);
        given(productCounts.countOf(skinCare)).willReturn(3L);
        given(productCounts.countOf(toner)).willReturn(3L);
        BrandDetail brandDetail = new BrandDetail(drG, categories, productCounts);
        BrandService brandService = mock(BrandService.class);
        given(brandService.findDetail(1L)).willReturn(brandDetail);
        BrandController controller = new BrandController(brandService);

        ResponseEntity<BrandDetailResponse> response = controller.findBrand(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(BrandDetailResponse.from(brandDetail));
        verify(brandService).findDetail(1L);
    }
}
