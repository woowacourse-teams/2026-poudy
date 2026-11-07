package com.poudy.shelf.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.sensory.ProductSensory;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("옮길 비로그인 파우치 제품")
class GuestShelfProductsTest {

    private static final OffsetDateTime REGISTERED_AT = OffsetDateTime.parse("2026-11-06T09:00:00+09:00");

    @Test
    @DisplayName("같은 제품이 두 번 오면 거절한다")
    void rejectsDuplicatedProduct() {
        List<ShelfProduct> shelfProducts = List.of(shelfProduct(1L, null, null), shelfProduct(1L, null, null));

        assertThatThrownBy(() -> GuestShelfProducts.of(shelfProducts))
            .isInstanceOf(DuplicatedGuestShelfProductException.class);
    }

    @Test
    @DisplayName("담은 순서대로 제품을 준다")
    void keepsShelfOrder() {
        GuestShelfProducts shelfProducts = GuestShelfProducts.of(
            List.of(shelfProduct(3L, null, null), shelfProduct(1L, null, null))
        );

        assertThat(shelfProducts.productIds()).containsExactly(3L, 1L);
        assertThat(shelfProducts.items()).extracting(ShelfProduct::productId).containsExactly(3L, 1L);
    }

    @Test
    @DisplayName("수분감·유분감을 받지 않는 제품에 수분감·유분감 평가가 있으면 거절한다")
    void rejectsSensoryRatingOfUnsupportedProduct() {
        GuestShelfProducts shelfProducts = GuestShelfProducts.of(
            List.of(shelfProduct(1L, 1.0, null), shelfProduct(2L, 1.0, 1.0))
        );

        assertThatThrownBy(
            () -> shelfProducts.validateRatingsFor(
                List.of(product(1L, ProductSensory.unavailable()), product(2L, sensory(1, 1)))
            )
        )
            .isInstanceOf(UnsupportedSensoryRatingException.class);
    }

    @Test
    @DisplayName("제품마다 받을 수 있는 평가면 통과한다")
    void acceptsSupportedRatings() {
        GuestShelfProducts shelfProducts = GuestShelfProducts.of(
            List.of(shelfProduct(1L, null, null), shelfProduct(2L, 1.0, 1.0))
        );

        assertThatCode(
            () -> shelfProducts.validateRatingsFor(
                List.of(product(1L, ProductSensory.unavailable()), product(2L, sensory(1, 1)))
            )
        )
            .doesNotThrowAnyException();
    }

    private static ShelfProduct shelfProduct(long productId, Double moistureLevel, Double oilLevel) {
        return new ShelfProduct(
            productId,
            ShelfUsageStatus.IN_USE,
            new Rating(RatingPreference.GOOD, moistureLevel, oilLevel),
            REGISTERED_AT
        );
    }

    private static Product product(Long id, ProductSensory sensory) {
        return new Product(
            id,
            "제품 " + id,
            new Brand(1L, "브랜드", null, null),
            new Category(1L, 100L, "카테고리", 1),
            List.of(),
            List.of(new ProductPart(id, null, new Ingredients(List.of()))),
            "https://example.com/" + id + ".png",
            new ProductVariants(List.of(new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active"))),
            sensory,
            false,
            OffsetDateTime.parse("2026-08-01T00:00:00Z")
        );
    }
}
