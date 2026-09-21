package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationBlockTest {

    @Test
    void removesMissingProductsAndEmptyFiltersWithoutChangingSavedMappings() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID missing = UUID.randomUUID();
        List<CurationProductMapping> mappings = new ArrayList<>(
            List.of(
                new CurationProductMapping(3L, List.of(b, a)),
                new CurationProductMapping(9L, List.of(missing)),
                new CurationProductMapping(1L, List.of(a))
            )
        );
        CurationBlock block = CurationBlock.productsByFilter(
            UUID.randomUUID(),
            8,
            24,
            List.of(new CurationFilter(a, "A"), new CurationFilter(missing, "누락"), new CurationFilter(b, "B")),
            mappings
        );
        mappings.clear();

        CurationBlockContent.ProductsByFilter content = (CurationBlockContent.ProductsByFilter) block.resolveContent(
            products(1L, 3L)
        ).orElseThrow();
        assertThat(content.products()).extracting(item -> item.product().id()).containsExactly(3L, 1L);
        assertThat(content.products().getFirst().filterIds()).containsExactly(b, a);
        assertThat(content.filters()).extracting(CurationFilter::id).containsExactly(a, b);
        assertThat(content.spacingTop()).isEqualTo(8);
        assertThat(content.spacingBottom()).isEqualTo(24);
        assertThat(block.resolveContent(Products.from(List.of()))).isEmpty();

        CurationBlockContent.ProductsByFilter restored = (CurationBlockContent.ProductsByFilter) block.resolveContent(
            products(9L, 1L, 3L)
        ).orElseThrow();
        assertThat(restored.products()).extracting(item -> item.product().id()).containsExactly(3L, 9L, 1L);
        assertThat(restored.filters()).extracting(CurationFilter::id).containsExactly(a, missing, b);
    }

    @Test
    void rejectsImageWithoutUrl() {
        assertThatThrownBy(() -> CurationBlock.image(UUID.randomUUID(), 0, 0, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void resolvesProductsWithoutFiltersInSavedOrder() {
        List<Long> productIds = new ArrayList<>(List.of(3L, 9L, 1L));
        CurationBlock block = CurationBlock.products(
            UUID.randomUUID(),
            0,
            16,
            productIds
        );
        productIds.clear();

        CurationBlockContent.Products content = (CurationBlockContent.Products) block.resolveContent(
            products(1L, 3L)
        ).orElseThrow();
        assertThat(content.products()).extracting(Product::id).containsExactly(3L, 1L);
        assertThat(block.resolveContent(Products.from(List.of()))).isEmpty();
    }

    @Test
    void rejectsInvalidProductMappings() {
        UUID id = UUID.randomUUID();
        CurationProductMapping mapping = new CurationProductMapping(1L, List.of(id));
        assertThatThrownBy(
            () -> CurationBlock.productsByFilter(
                UUID.randomUUID(),
                0,
                0,
                List.of(),
                List.of(mapping)
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> CurationBlock.productsByFilter(
                UUID.randomUUID(),
                0,
                0,
                List.of(new CurationFilter(id, "A")),
                List.of(mapping, mapping)
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurationProductMapping(1L, List.of()))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurationProductMapping(1L, List.of(id, id)))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> CurationBlock.products(
                UUID.randomUUID(),
                0,
                0,
                List.of(1L, 1L)
            )
        ).isInstanceOf(IllegalArgumentException.class);
    }

    private static Products products(Long... ids) {
        return Products.from(java.util.Arrays.stream(ids).map(id -> {
            Product product = mock(Product.class);
            given(product.id()).willReturn(id);
            return product;
        }).toList());
    }
}
