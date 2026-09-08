package com.poudy.curation.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.brand.domain.Brand;
import com.poudy.curation.controller.dto.CurationDetailResponse;
import com.poudy.curation.controller.dto.CurationListResponse;
import com.poudy.curation.controller.dto.CurationProductListResponse;
import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationStatus;
import com.poudy.curation.service.CurationService;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("큐레이션 컨트롤러")
class CurationControllerTest {

    @Test
    @DisplayName("서비스에서 조회한 큐레이션 목록을 200 응답으로 반환한다")
    void findsCurations() {
        Curation curation = curation();
        CurationService service = mock(CurationService.class);
        given(service.findCurations()).willReturn(List.of(curation));
        CurationController controller = new CurationController(service);

        ResponseEntity<CurationListResponse> response = controller.findCurations();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(CurationListResponse.from(List.of(curation)));
        verify(service).findCurations();
    }

    @Test
    @DisplayName("서비스에서 조회한 큐레이션 상세를 200 응답으로 반환한다")
    void findsCurationDetail() {
        Curation curation = curation();
        CurationService service = mock(CurationService.class);
        given(service.findDetail(12L)).willReturn(curation);
        CurationController controller = new CurationController(service);

        ResponseEntity<CurationDetailResponse> response = controller.findCuration(12L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(CurationDetailResponse.from(curation));
        verify(service).findDetail(12L);
    }

    @Test
    @DisplayName("서비스에서 조회한 큐레이션 제품을 200 응답으로 반환한다")
    void findsCurationProducts() {
        Product product = product();
        CurationService service = mock(CurationService.class);
        given(service.findProducts(12L, 1L)).willReturn(List.of(product));
        CurationController controller = new CurationController(service);

        ResponseEntity<CurationProductListResponse> response = controller.findCurationProducts(12L, 1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(CurationProductListResponse.from(List.of(product)));
        verify(service).findProducts(12L, 1L);
    }

    private static Curation curation() {
        return new Curation(
            12L,
            "제목",
            "간단 설명",
            "상세 설명",
            List.of("https://example.com/main.png"),
            List.of(),
            List.of(),
            CurationStatus.PUBLISHED
        );
    }

    private static Product product() {
        Brand brand = mock(Brand.class);
        given(brand.koreanName()).willReturn("브랜드");
        ProductVariant variant = mock(ProductVariant.class);
        given(variant.price()).willReturn(10_000L);
        given(variant.volumeValue()).willReturn(new BigDecimal("100"));
        given(variant.volumeUnit()).willReturn("ml");
        Product product = mock(Product.class);
        given(product.id()).willReturn(1L);
        given(product.name()).willReturn("제품");
        given(product.brand()).willReturn(brand);
        given(product.imageUrl()).willReturn("https://example.com/product.png");
        given(product.representativeVariant()).willReturn(variant);
        given(product.moistureLevel()).willReturn(2);
        given(product.oilLevel()).willReturn(1);
        return product;
    }
}
