package com.poudy.shelf.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("비로그인 평가 목록")
class GuestRatingsTest {

    private static final long LIMONENE = 1L;
    private static final long ALCOHOL = 2L;
    private static final long WATER = 100L;

    private static final SuspectCandidates CANDIDATES = SuspectCandidates.of(Set.of(LIMONENE, ALCOHOL), Map.of());
    private static final ExcludeCodes EXCLUDE_CODES = new ExcludeCodes(
        List.of(
            new ExcludeCodeGroup(
                ExcludeCode.FRAGRANCE_ALLERGENS,
                ExcludeCode.FRAGRANCE_ALLERGENS.value(),
                ExcludeCode.FRAGRANCE_ALLERGENS.value(),
                "설명",
                List.of(new ExcludeCodeIngredient(LIMONENE, "성분 " + LIMONENE, null))
            )
        )
    );

    @Test
    @DisplayName("같은 제품을 두 번 평가하면 거절한다")
    void rejectsDuplicatedProduct() {
        List<GuestRating> ratings = List.of(
            new GuestRating(1L, RatingPreference.BAD),
            new GuestRating(1L, RatingPreference.GOOD)
        );

        assertThatThrownBy(() -> GuestRatings.of(ratings)).isInstanceOf(DuplicatedGuestShelfProductException.class);
    }

    @Test
    @DisplayName("평가한 순서대로 제품 ID를 준다")
    void keepsRatingOrder() {
        GuestRatings ratings = GuestRatings.of(
            List.of(new GuestRating(3L, null), new GuestRating(1L, RatingPreference.BAD))
        );

        assertThat(ratings.productIds()).containsExactly(3L, 1L);
    }

    @Test
    @DisplayName("안 맞은 제품으로 후보를 고르고, 잘 맞은 제품에 든 성분은 빼고, 남은 후보가 든 제품을 평가 순서대로 알려 준다")
    void analyzesRatings() {
        Product unsuitedToner = product(1L, WATER, LIMONENE, ALCOHOL);
        Product suitedCream = product(2L, ALCOHOL);
        Product unratedSerum = product(3L, LIMONENE);
        GuestRatings ratings = GuestRatings.of(
            List.of(
                new GuestRating(3L, null),
                new GuestRating(1L, RatingPreference.BAD),
                new GuestRating(2L, RatingPreference.GOOD)
            )
        );

        GuestIngredientAnalysis analysis = ratings.analyze(
            List.of(unsuitedToner, suitedCream, unratedSerum),
            CANDIDATES,
            EXCLUDE_CODES
        );

        assertThat(analysis.analysis().badProductCount()).isEqualTo(1);
        assertThat(analysis.analysis().items()).extracting(AnalyzedIngredient::id).containsExactly(LIMONENE);
        assertThat(analysis.analysis().items()).noneMatch(AnalyzedIngredient::inFilter);
        assertThat(analysis.analysis().items()).noneMatch(AnalyzedIngredient::isNew);
        assertThat(analysis.possiblyUnsuitableProductIds()).containsExactly(3L, 1L);
    }

    private static Product product(Long id, Long... ingredientIds) {
        return new Product(
            id,
            "제품 " + id,
            new Brand(1L, "브랜드", null, null),
            new Category(1L, 100L, "카테고리", 1),
            List.of(),
            List.of(
                new ProductPart(
                    id,
                    null,
                    new Ingredients(Arrays.stream(ingredientIds).map(GuestRatingsTest::ingredient).toList())
                )
            ),
            "https://example.com/" + id + ".png",
            new ProductVariants(List.of(new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active"))),
            sensory(1, 1),
            false,
            OffsetDateTime.parse("2026-08-01T00:00:00Z")
        );
    }

    private static Ingredient ingredient(Long id) {
        return Ingredient.create(id, "성분 " + id, null, null, null, null, null, null);
    }
}
