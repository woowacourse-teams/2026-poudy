package com.poudy.productview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import com.poudy.productview.domain.ViewPeriod;
import com.poudy.productview.repository.ProductViewRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
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
        when(first.belongsToAnyCategory(List.of(1L))).thenReturn(true);
        when(second.belongsToAnyCategory(List.of(1L))).thenReturn(true);
        Products products = Products.from(List.of(first, second));
        ProductRepository productRepository = mock(ProductRepository.class);
        when(productRepository.findAll()).thenReturn(products);
        ProductViewRepository productViewRepository = mock(ProductViewRepository.class);
        when(productViewRepository.sumViewCounts(ViewPeriod.recentDays(today, 7))).thenReturn(Map.of(2L, 3L));
        ProductViewService service = new ProductViewService(
            productRepository,
            productViewRepository,
            Clock.fixed(instant, ZoneOffset.UTC)
        );

        assertThat(service.findRankings(List.of(1L), 7)).containsExactly(second, first);
        verify(productRepository, times(1)).findAll();
        verify(productViewRepository, times(1)).sumViewCounts(ViewPeriod.recentDays(today, 7));
    }

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
        verify(productViewRepository).sumViewCounts(ViewPeriod.recentDays(expectedDate, 7));
        verify(productViewRepository).sumAllViewCounts();
    }
}
