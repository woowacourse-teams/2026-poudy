package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;

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

    @ParameterizedTest
    @ValueSource(strings = {
            "{}",
            "{\"ingredient_id\":null}",
            "{\"ingredient_id\":\"4815\"}",
            "{\"ingredient_id\":1.5}"})
    @DisplayName("성분 참조의 ID 가 누락됐거나 정수가 아니면 로딩에 실패한다")
    void rejectsInvalidIngredientReference(String reference) {
        String productData = """
                {"products":[{
                  "id":1,
                  "brand_id":1,
                  "category_id":1,
                  "product_name":"제품",
                  "ingredients":[%s]
                }]}
                """.formatted(reference);
        DefaultResourceLoader resourceLoader = new DefaultResourceLoader() {

            @Override
            public Resource getResource(String location) {
                return new ByteArrayResource(productData.getBytes(StandardCharsets.UTF_8));
            }
        };

        assertThatThrownBy(() -> new ProductRepository(new JsonDataReader(resourceLoader), new Ingredients(List.of())))
                .isInstanceOf(InfrastructureException.class);
    }
}
