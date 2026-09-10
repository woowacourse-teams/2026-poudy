package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.poudy.category.domain.Categories;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.mock.env.MockEnvironment;

class SearchKeywordConfigTest {
    @Test
    void missingDictionaryFailsStartup() {
        ResourceLoader resources = mock(ResourceLoader.class);
        when(resources.getResource("classpath:search_keywords.json"))
            .thenReturn(new FileSystemResource("/no-such-poudy-dictionary.json"));
        ProductRepository products = mock(ProductRepository.class);
        when(products.findAll()).thenReturn(Products.from(List.of()));

        assertThatThrownBy(
            () -> new SearchKeywordConfig().searchKeywordRuntime(
                new MockEnvironment(),
                resources,
                products,
                Categories.from(List.of()),
                Clock.systemUTC(),
                new SimpleMeterRegistry()
            )
        ).isInstanceOf(java.io.IOException.class);
    }

    @Test
    void corruptDictionaryFailsBeforeReadingOrWritingState() {
        ResourceLoader resources = mock(ResourceLoader.class);
        when(resources.getResource("classpath:search_keywords.json"))
            .thenReturn(new ByteArrayResource("{}".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        ProductRepository products = mock(ProductRepository.class);
        when(products.findAll()).thenReturn(Products.from(List.of()));
        assertThatThrownBy(
            () -> new SearchKeywordConfig().searchKeywordRuntime(
                new MockEnvironment(),
                resources,
                products,
                Categories.from(List.of()),
                Clock.systemUTC(),
                new SimpleMeterRegistry()
            )
        )
            .isInstanceOf(com.poudy.exception.InfrastructureException.class);
    }
}
