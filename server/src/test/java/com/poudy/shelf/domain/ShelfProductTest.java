package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.sensory.ProductSensory;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("선반 제품")
class ShelfProductTest {

    private static final OffsetDateTime REGISTERED_AT = OffsetDateTime.parse("2026-10-14T10:00:00+09:00");

    @Test
    @DisplayName("전체 탭과 자기 사용 상태의 탭에만 속한다")
    void belongsToTabsOfItsUsageStatus() {
        ShelfProduct inUse = new ShelfProduct(1L, ShelfUsageStatus.IN_USE, new Rating(null, null, null), REGISTERED_AT);

        assertThat(inUse.belongsTo(ShelfTab.ALL)).isTrue();
        assertThat(inUse.belongsTo(ShelfTab.IN_USE)).isTrue();
        assertThat(inUse.belongsTo(ShelfTab.USED)).isFalse();
    }

    @Test
    @DisplayName("안 맞았어요로 평가한 제품만 안 맞은 제품이다")
    void isRatedBadOnlyWithBadPreference() {
        assertThat(shelfProductRated(RatingPreference.BAD).isRatedBad()).isTrue();
        assertThat(shelfProductRated(RatingPreference.GOOD).isRatedBad()).isFalse();
        assertThat(shelfProductRated(null).isRatedBad()).isFalse();
    }

    @Test
    @DisplayName("호불호가 달라질 때만 평가가 바뀐 것이고, 사용 상태와 수분감·유분감은 보지 않는다")
    void changesPreferenceOnlyWhenPreferenceDiffers() {
        ShelfProduct bad = new ShelfProduct(
            1L,
            ShelfUsageStatus.IN_USE,
            new Rating(RatingPreference.BAD, 1.0, 2.0),
            REGISTERED_AT
        );

        assertThat(bad.changesPreferenceTo(new Rating(RatingPreference.BAD, null, 3.0))).isFalse();
        assertThat(bad.changesPreferenceTo(new Rating(RatingPreference.GOOD, 1.0, 2.0))).isTrue();
        assertThat(bad.changesPreferenceTo(new Rating(null, 1.0, 2.0))).isTrue();
        assertThat(shelfProductRated(null).changesPreferenceTo(new Rating(null, 2.0, null))).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"향수", "클렌징"})
    @DisplayName("향수·클렌징의 기존 평가에서는 유수분만 제외하고 선호도는 유지한다")
    void hidesSensoryWithoutChangingStoredRating(String category) {
        ShelfProduct shelfProduct = new ShelfProduct(
            1L,
            ShelfUsageStatus.IN_USE,
            new Rating(RatingPreference.GOOD, 2.5, 0.0),
            REGISTERED_AT
        );

        Rating visibleRating = shelfProduct.ratingFor(product(category));

        assertThat(visibleRating.isGood()).isTrue();
        assertThat(visibleRating.moistureLevel()).isNull();
        assertThat(visibleRating.oilLevel()).isNull();
        Rating storedRating = shelfProduct.ratingFor(product("스킨케어"));
        assertThat(storedRating.moistureLevel()).isEqualTo(2.5);
        assertThat(storedRating.oilLevel()).isZero();
    }

    @Test
    @DisplayName("유수분을 제공하는 제품은 선호도와 유수분 평가를 그대로 반환한다")
    void preservesSensoryForSupportedProduct() {
        ShelfProduct shelfProduct = new ShelfProduct(
            1L,
            ShelfUsageStatus.USED,
            new Rating(RatingPreference.BAD, 0.0, 3.0),
            REGISTERED_AT
        );

        Rating rating = shelfProduct.ratingFor(product("스킨케어"));

        assertThat(rating.isBad()).isTrue();
        assertThat(rating.moistureLevel()).isZero();
        assertThat(rating.oilLevel()).isEqualTo(3.0);
    }

    private Product product(String rootCategory) {
        return new Product(
            1L,
            "제품",
            new Brand(1L, "브랜드", null, null),
            new Category(2L, 1L, "하위 분류", 1),
            List.of(),
            List.of(),
            "",
            new ProductVariants(
                List.of(
                    new ProductVariant(1L, 10000L, BigDecimal.valueOf(100), "ml", "active")
                )
            ),
            ProductSensory.forCategory(rootCategory, 2, 1),
            false,
            REGISTERED_AT
        );
    }

    private ShelfProduct shelfProductRated(RatingPreference preference) {
        return new ShelfProduct(1L, ShelfUsageStatus.USED, new Rating(preference, null, null), REGISTERED_AT);
    }
}
