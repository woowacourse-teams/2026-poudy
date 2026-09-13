package com.poudy.productview.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import com.poudy.productview.repository.ProductViewRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ProductViewServiceTest {

    @ParameterizedTest
    @CsvSource({
            "2026-09-11T14:59:59Z, 2026-09-11",
            "2026-09-11T15:00:00Z, 2026-09-12"
    })
    void usesKoreanDateForIncreaseAndPeriodQuery(Instant instant, LocalDate expectedDate) {
        ProductRepository productRepository = mock(ProductRepository.class);
        Products products = mock(Products.class);
        when(productRepository.findAll()).thenReturn(products);
        when(products.findById(1L)).thenReturn(Optional.of(mock(Product.class)));
        ProductViewRepository productViewRepository = mock(ProductViewRepository.class);
        ProductViewService productViewService = new ProductViewService(
            productRepository,
            productViewRepository,
            Clock.fixed(instant, ZoneOffset.UTC)
        );

        productViewService.increaseViewCount(1L);
        productViewService.sumViewCounts(7);
        productViewService.sumViewCounts(null);

        verify(productViewRepository).increaseViewCount(1L, expectedDate);
        verify(productViewRepository).sumViewCounts(expectedDate, 7);
        verify(productViewRepository).sumViewCounts(expectedDate, null);
    }
}
