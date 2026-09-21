package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandProductCount;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import com.poudy.skintype.domain.SkinType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
    @DisplayName("DB의 참조 ID 를 도메인 객체로 풀어 제품을 세운다")
    void resolvesReferenceIdsIntoObjects() {
        List<Product> found = productRepository.findByProductName("블랙 스네일 토너", null).stream()
            .map(com.poudy.product.domain.ProductNameMatch::product).toList();

        assertThat(found).hasSize(1);
        Product product = found.getFirst();
        assertThat(product.id()).isEqualTo(1L);
        assertThat(product.brand()).extracting(Brand::id, Brand::koreanName)
            .containsExactly(1L, "다 브랜드");
        assertThat(product.belongsToCategory(2L)).isTrue();
        assertThat(product.belongsToCategory(1L)).isTrue();
        assertThat(product.name()).isEqualTo("블랙 스네일 토너");
        assertThat(product.imageUrl()).isEqualTo("https://cdn.example.com/products/1.png");
        assertThat(product.representativeVariant())
            .extracting("price", "volumeValue", "volumeUnit", "status")
            .containsExactly(18000L, new BigDecimal("200"), "ml", "active");
        assertThat(product.moistureLevel()).isEqualTo(2);
        assertThat(product.oilLevel()).isZero();
        assertThat(product.updatedAt()).isEqualTo(OffsetDateTime.parse("2026-08-13T08:28:29.301Z"));
        assertThat(product.contains(4815L)).isTrue();
        assertThat(product.ingredients().findById(4815L))
            .get()
            .extracting(Ingredient::koreanName)
            .isEqualTo("향료");
    }

    @Test
    @DisplayName("DB에 저장된 수분감·유분감 단계를 그대로 읽는다")
    void readsStoredSensoryLevels() {
        Product product = productRepository.findById(10L).orElseThrow();

        assertThat(product.moistureLevel()).isEqualTo(1);
        assertThat(product.oilLevel()).isEqualTo(2);
    }

    @Test
    @DisplayName("성분을 포함한 제품 수는 조립된 성분으로 센다")
    void countsWithResolvedIngredients() {
        assertThat(productRepository.countContainingIngredient(4815L)).isPositive();
        assertThat(productRepository.countContainingIngredient(999999L)).isZero();
    }

    @Test
    @DisplayName("브랜드별 제품 수를 센다")
    void countsProductsByBrand() {
        List<Brand> brands = List.of(
            new Brand(1L, "다 브랜드", null, null),
            new Brand(3L, "가 브랜드", null, null),
            new Brand(999L, "없는 브랜드", null, null)
        );

        assertThat(productRepository.productCountsByBrand(brands))
            .extracting(BrandProductCount::id, BrandProductCount::productCount)
            .containsExactly(tuple(1L, 3L), tuple(3L, 2L), tuple(999L, 0L));
    }

    @Test
    @DisplayName("제품의 복수 피부타입을 로딩하고 선택한 타입을 판정한다")
    void loadsSkinTypes() {
        Product product = productRepository.findById(1L).orElseThrow();

        assertThat(product.matchesSkinType(SkinType.DRY)).isTrue();
        assertThat(product.matchesSkinType(SkinType.SENSITIVE)).isTrue();
        assertThat(product.matchesSkinType(SkinType.OILY)).isFalse();
        assertThat(product.matchesSkinType(null)).isTrue();
    }

    @Test
    @DisplayName("피부타입이 없는 제품은 미분류 제품으로 로딩한다")
    void loadsUnclassifiedProduct() {
        Product product = productRepository.findById(7L).orElseThrow();

        assertThat(product.matchesSkinType(null)).isTrue();
        assertThat(SkinType.values()).allSatisfy(skinType -> assertThat(product.matchesSkinType(skinType)).isFalse());
    }
}
