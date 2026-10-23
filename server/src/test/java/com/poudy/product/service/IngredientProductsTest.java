package com.poudy.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.poudy.ingredient.domain.IngredientProducts;
import com.poudy.product.repository.ProductQueryRepository;
import com.poudy.product.repository.ProductRepository;
import org.junit.jupiter.api.Test;

class IngredientProductsTest {
    @Test
    void omittedSizeOnlyCountsWithoutQueryingProductList() {
        ProductRepository repository = mock(ProductRepository.class);
        ProductQueryRepository queries = mock(ProductQueryRepository.class);
        when(repository.countContainingIngredient(9L)).thenReturn(17L);
        IngredientProducts result = new ProductCountService(repository, queries).productsContaining(9L, 0);
        assertThat(result.total()).isEqualTo(17);
        assertThat(result.items()).isEmpty();
        verifyNoInteractions(queries);
    }
}
