package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.poudy.exception.InfrastructureException;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
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

        assertThatThrownBy(
            () -> new SearchKeywordConfig().searchKeywordDictionary(new MockEnvironment(), resources, emptyCatalog())
        ).isInstanceOf(IOException.class);
    }

    @Test
    void corruptDictionaryFailsStartup() {
        ResourceLoader resources = mock(ResourceLoader.class);
        when(resources.getResource("classpath:search_keywords.json"))
            .thenReturn(new ByteArrayResource("{}".getBytes(StandardCharsets.UTF_8)));

        assertThatThrownBy(
            () -> new SearchKeywordConfig().searchKeywordDictionary(new MockEnvironment(), resources, emptyCatalog())
        ).isInstanceOf(InfrastructureException.class);
    }

    private static ProductRepository emptyCatalog() {
        ProductRepository products = mock(ProductRepository.class);
        when(products.findAll()).thenReturn(Products.from(List.of()));
        return products;
    }
}
