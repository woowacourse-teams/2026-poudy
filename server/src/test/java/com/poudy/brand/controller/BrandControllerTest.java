package com.poudy.brand.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.brand.controller.dto.BrandDetailResponse;
import com.poudy.brand.controller.dto.BrandOverviewResponse;
import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.brand.domain.BrandSummary;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.service.BrandService;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CountedCategory;
import com.poudy.product.domain.ProductCountsByBrand;
import com.poudy.product.service.ProductService;
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
        ProductCountsByBrand productCounts = new ProductCountsByBrand(Map.of(1L, 3L));
        List<BrandSummary> brandSummaries = productCounts.summariesOf(new Brands(List.of(drG)).sortedByName());
        BrandService brandService = mock(BrandService.class);
        ProductService productService = mock(ProductService.class);
        given(brandService.findBrands()).willReturn(brandSummaries);
        BrandController controller = new BrandController(brandService, productService);

        ResponseEntity<BrandOverviewResponse> response = controller.findBrands();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(BrandOverviewResponse.from(brandSummaries));
        verify(brandService).findBrands();
    }

    @Test
    @DisplayName("서비스에서 조회한 브랜드 상세를 200 응답으로 반환한다")
    void findsBrandDetail() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        CountedCategory toner = new CountedCategory(new Category(2L, 1L, "토너", 1), 3L, List.of());
        CountedCategory skinCare = new CountedCategory(
                new Category(1L, null, "스킨케어", 0),
                3L,
                List.of(toner));
        BrandDetail brandDetail = new BrandDetail(drG, List.of(skinCare));
        BrandService brandService = mock(BrandService.class);
        ProductService productService = mock(ProductService.class);
        given(productService.findBrandDetail(1L)).willReturn(brandDetail);
        BrandController controller = new BrandController(brandService, productService);

        ResponseEntity<BrandDetailResponse> response = controller.findBrand(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(BrandDetailResponse.from(brandDetail));
        verify(productService).findBrandDetail(1L);
    }
}
