package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.poudy.category.repository.CategoryRepository;
import com.poudy.product.domain.ProductFilter;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import com.poudy.search.domain.SearchKeyword;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CatalogKeywordSearchTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void usesExistingProductSearchWithBrandIntentWithoutRereadingCatalogs() {
        Products products = productRepository.findAll();
        ProductRepository repository = mock(ProductRepository.class);
        when(repository.findAll()).thenReturn(products);
        CatalogKeywordSearch search = new CatalogKeywordSearch(repository);

        for (String keyword : java.util.List.of(
            "다 브랜드 블랙 스네일 토너",
            "가 브랜드 블랙 스네일 토너",
            "다 브랜드",
            "토너",
            "ㅌㄴ",
            "toner",
            "없는상품"
        )) {
            boolean expected = products.find(
                new ProductFilter(new SearchKeyword(keyword), null, null, null, null, null, null),
                null,
                1,
                1,
                categoryRepository.findAll()
            ).totalElements() > 0;
            assertThat(search.hasResults(keyword)).as(keyword).isEqualTo(expected);
        }

        verify(repository).findAll();
        verifyNoMoreInteractions(repository);
    }
}
