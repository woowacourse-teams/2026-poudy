package com.poudy.brand.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.brand.controller.dto.BrandListResponse;
import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.service.BrandService;
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
}
