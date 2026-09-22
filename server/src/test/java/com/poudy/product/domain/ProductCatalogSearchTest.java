package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.category.repository.CategoryRepository;
import com.poudy.product.repository.ProductRepository;
import com.poudy.search.domain.SearchKeyword;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ProductCatalogSearchTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void hasResultsUsesTheSameProductSearchRules() {
        Products products = productRepository.findAll();

        for (String keyword : List.of(
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

            assertThat(products.hasResults(keyword)).as(keyword).isEqualTo(expected);
        }
    }
}
