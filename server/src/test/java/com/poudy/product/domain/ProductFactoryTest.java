package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.product.domain.sensory.ProductSensoryEstimator;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 factory")
class ProductFactoryTest {

    @Test
    @DisplayName("해석된 category와 전성분으로 감각을 한 번 계산해 제품에 넣는다")
    void estimatesSensoryOnceWhileCreatingProduct() {
        ProductSensoryEstimator estimator = mock(ProductSensoryEstimator.class);
        ProductSensory sensory = sensory(2, 1);
        Category category = new Category(2L, 1L, "스킨/토너", 1);
        Ingredients ingredients = new Ingredients(List.of());
        given(estimator.estimate(category, ingredients)).willReturn(sensory);
        ProductFactory factory = new ProductFactory(estimator);

        Product product = factory.create(
            1L,
            "제품",
            new Brand(1L, "브랜드", null, null),
            category,
            ingredients,
            "https://example.com/product.png",
            new ProductVariants(
                List.of(
                    new ProductVariant(
                        1L,
                        10000L,
                        new BigDecimal("100"),
                        "ml",
                        "active"
                    )
                )
            ),
            OffsetDateTime.parse("2026-08-01T00:00:00Z")
        );

        assertThat(product.sensory()).isSameAs(sensory);
        verify(estimator).estimate(category, ingredients);
    }

    @Test
    @DisplayName("감각 추론기가 없으면 만들 수 없다")
    void rejectsMissingEstimator() {
        assertThatThrownBy(() -> new ProductFactory(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품 감각 추론기가 필요합니다.");
    }
}
