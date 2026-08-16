package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("제품 저장소")
class ProductRepositoryTest {

    @Autowired
    private ProductRepository productRepository;

    @Test
    @DisplayName("파일의 성분 ID 를 성분 객체로 풀어 제품을 세운다")
    void resolvesIngredientIdsIntoObjects() {
        List<Product> found = productRepository.findAll().search("블랙 스네일 토너");

        assertThat(found).hasSize(1);
        Product product = found.getFirst();
        assertThat(product.id()).isEqualTo(1L);
        assertThat(product.brandId()).isEqualTo(1L);
        assertThat(product.categoryId()).isEqualTo(2L);
        assertThat(product.contains(4815L)).isTrue();
        // spotless:off
        assertThat(product.ingredients().findById(4815L))
                .get()
                .extracting(Ingredient::koreanName)
                .isEqualTo("향료");
        // spotless:on
    }

    @Test
    @DisplayName("성분을 포함한 제품 수는 조립된 성분으로 센다")
    void countsWithResolvedIngredients() {
        assertThat(productRepository.countContaining(4815L)).isPositive();
        assertThat(productRepository.countContaining(999999L)).isZero();
    }
}
