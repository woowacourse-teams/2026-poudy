package com.poudy.productview.service;

import static org.assertj.core.api.Assertions.assertThat;
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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ProductViewServiceTest {

    @Test
    void combinesOnePeriodSnapshotWithCurrentCatalog() {
        Instant instant = Instant.parse("2026-09-11T15:00:00Z");
        LocalDate today = LocalDate.of(2026, 9, 12);
        Product first = mock(Product.class);
        Product second = mock(Product.class);
        when(first.id()).thenReturn(1L);
        when(second.id()).thenReturn(2L);
        ProductRepository productRepository = mock(ProductRepository.class);
        when(productRepository.existsById(1L)).thenReturn(true);
        ProductViewRepository productViewRepository = mock(ProductViewRepository.class);
        when(productRepository.findRankings(List.of(1L), today.minusDays(6), today)).thenReturn(List.of(second, first));
        ProductViewService service = new ProductViewService(
            productRepository,
            productViewRepository,
            Clock.fixed(instant, ZoneOffset.UTC)
        );

        assertThat(service.findRankings(List.of(1L), 7)).containsExactly(second, first);
        verify(productRepository).findRankings(List.of(1L), today.minusDays(6), today);

    }

    @ParameterizedTest
    @CsvSource({
            "2026-09-11T14:59:59Z, 2026-09-11",
            "2026-09-11T15:00:00Z, 2026-09-12"
    })
    void usesKoreanDateForIncrease(Instant instant, LocalDate expectedDate) {
        ProductRepository productRepository = mock(ProductRepository.class);
        Products products = mock(Products.class);
        when(productRepository.existsById(1L)).thenReturn(true);
        when(products.findById(1L)).thenReturn(Optional.of(mock(Product.class)));
        ProductViewRepository productViewRepository = mock(ProductViewRepository.class);
        ProductViewService productViewService = new ProductViewService(
            productRepository,
            productViewRepository,
            Clock.fixed(instant, ZoneOffset.UTC)
        );

        productViewService.increaseViewCount(1L);

        verify(productViewRepository).increaseViewCount(1L, expectedDate);
    }
}
