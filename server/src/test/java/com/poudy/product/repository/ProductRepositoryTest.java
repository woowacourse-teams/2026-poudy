package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductFactory;
import com.poudy.product.domain.sensory.HeuristicProductSensoryEstimator;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
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
    @DisplayName("파일의 참조 ID 를 도메인 객체로 풀어 제품을 세운다")
    void resolvesReferenceIdsIntoObjects() {
        List<Product> found = productRepository.findAll().search("블랙 스네일 토너");

        assertThat(found).hasSize(1);
        Product product = found.getFirst();
        assertThat(product.id()).isEqualTo(1L);
        assertThat(product.brand()).extracting(Brand::id, Brand::koreanName)
                .containsExactly(1L, "다 브랜드");
        assertThat(product.category()).extracting(Category::id, Category::name)
                .containsExactly(2L, "스킨/토너");
        assertThat(product.name()).isEqualTo("블랙 스네일 토너");
        assertThat(product.imageUrl()).isEqualTo("https://cdn.example.com/products/1.png");
        assertThat(product.representativeVariant())
                .extracting("price", "volumeValue", "volumeUnit", "status")
                .containsExactly(18000L, new BigDecimal("200"), "ml", "active");
        assertThat(product.moistureLevel()).isEqualTo(2);
        assertThat(product.oilLevel()).isZero();
        assertThat(product.sensory().modelVersion().ingredientProfileVersion())
                .isEqualTo("ingredient-role-profile-v0.2");
        assertThat(product.updatedAt()).isEqualTo(OffsetDateTime.parse("2026-08-13T08:28:29.301Z"));
        assertThat(product.contains(4815L)).isTrue();
        assertThat(product.ingredients().findById(4815L))
                .get()
                .extracting(Ingredient::koreanName)
                .isEqualTo("향료");
    }

    @Test
    @DisplayName("대표 이미지가 없으면 빈 URL로 제품을 로딩한다")
    void loadsProductWithoutImage() {
        Product product = repositoryReading(1L, 2L, "", "null")
                .findAll()
                .findById(1L)
                .orElseThrow();

        assertThat(product.imageUrl()).isEmpty();
    }

    @Test
    @DisplayName("대표 이미지가 null이나 문자열이 아니면 로딩에 실패한다")
    void rejectsInvalidProductImage() {
        assertThatThrownBy(() -> repositoryReading(1L, 2L, "", "123"))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("성분을 포함한 제품 수는 조립된 성분으로 센다")
    void countsWithResolvedIngredients() {
        assertThat(productRepository.countContaining(4815L)).isPositive();
        assertThat(productRepository.countContaining(999999L)).isZero();
    }

    @Test
    @DisplayName("브랜드별 제품 수를 센다")
    void countsProductsByBrandId() {
        assertThat(productRepository.countByBrandId()).isEqualTo(Map.of(1L, 3L, 3L, 2L));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}",
            "{\"ingredient_id\":null}",
            "{\"ingredient_id\":\"4815\"}",
            "{\"ingredient_id\":1.5}"})
    @DisplayName("성분 참조의 ID 가 누락됐거나 정수가 아니면 로딩에 실패한다")
    void rejectsInvalidIngredientReference(String reference) {
        assertThatThrownBy(() -> repositoryReading(1L, 2L, reference))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("존재하지 않는 성분을 참조하면 로딩에 실패한다")
    void rejectsUnknownIngredientReference() {
        assertThatThrownBy(() -> repositoryReading(1L, 2L, "{\"ingredient_id\":999}"))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("존재하지 않는 브랜드를 참조하면 로딩에 실패한다")
    void rejectsUnknownBrandReference() {
        assertThatThrownBy(() -> repositoryReading(999L, 2L, ""))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("존재하지 않는 카테고리를 참조하면 로딩에 실패한다")
    void rejectsUnknownCategoryReference() {
        assertThatThrownBy(() -> repositoryReading(1L, 999L, ""))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("대분류를 제품 카테고리로 참조하면 로딩에 실패한다")
    void rejectsParentCategoryReference() {
        assertThatThrownBy(() -> repositoryReading(1L, 1L, ""))
                .isInstanceOf(InfrastructureException.class);
    }

    private static ProductRepository repositoryReading(Long brandId, Long categoryId, String ingredientReferences) {
        return repositoryReading(brandId, categoryId, ingredientReferences, "\"https://example.com/product.png\"");
    }

    private static ProductRepository repositoryReading(
            Long brandId,
            Long categoryId,
            String ingredientReferences,
            String imageUrl) {
        String productData = """
                {"products":[{
                  "id":1,
                  "brand_id":%d,
                  "category_id":%d,
                  "product_name":"제품",
                  "image_url":%s,
                  "variants":[{
                    "id":1,
                    "price":10000,
                    "volume_value":100,
                    "volume_unit":"ml",
                    "status":"active"
                  }],
                  "updated_at":"2026-08-01T00:00:00Z",
                  "ingredients":[%s]
                }]}
                """.formatted(brandId, categoryId, imageUrl, ingredientReferences);
        DefaultResourceLoader resourceLoader = new DefaultResourceLoader() {

            @Override
            public Resource getResource(String location) {
                return new ByteArrayResource(productData.getBytes(StandardCharsets.UTF_8));
            }
        };

        return new ProductRepository(
                new JsonDataReader(resourceLoader),
                brands(),
                categories(),
                new Ingredients(List.of()),
                new ProductFactory(new HeuristicProductSensoryEstimator()));
    }

    private static Brands brands() {
        return new Brands(List.of(new Brand(1L, "다 브랜드", null, null)));
    }

    private static Categories categories() {
        Category parent = new Category(1L, null, "스킨케어", 0);
        Category child = new Category(2L, 1L, "스킨/토너", 1);

        return Categories.from(List.of(parent, child));
    }
}
