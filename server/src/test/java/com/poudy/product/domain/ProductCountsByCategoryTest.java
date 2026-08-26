package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리별 제품 수")
class ProductCountsByCategoryTest {

    @Test
    @DisplayName("집계된 카테고리의 제품 수를 반환한다")
    void returnsProductCount() {
        Category toner = category(2L);
        ProductCountsByCategory productCounts = new ProductCountsByCategory(Map.of(2L, 3L));

        assertThat(productCounts.countOf(toner)).isEqualTo(3L);
    }

    @Test
    @DisplayName("집계되지 않은 카테고리의 제품 수는 0이다")
    void returnsZeroForUncountedCategory() {
        Category toner = category(2L);
        ProductCountsByCategory productCounts = new ProductCountsByCategory(Map.of());

        assertThat(productCounts.countOf(toner)).isZero();
    }

    @Test
    @DisplayName("제품이 있는 소분류와 그 대분류만 제품 수와 함께 반환한다")
    void returnsNonEmptyCategories() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category serum = child(3L, 1L, "세럼");
        Categories categories = Categories.from(
                List.of(skinCare, toner, serum, parent(4L, "선케어"), child(5L, 4L, "선크림")));
        ProductCountsByCategory productCounts = new ProductCountsByCategory(Map.of(1L, 3L, 2L, 2L, 3L, 1L));

        List<CategoryProductCount> countedCategories = productCounts.nonEmptyCategoriesOf(categories);

        assertThat(countedCategories)
                .extracting(CategoryProductCount::id, CategoryProductCount::name, CategoryProductCount::productCount)
                .containsExactly(tuple(skinCare.id(), "스킨케어", 3L));
        assertThat(countedCategories.getFirst().children())
                .extracting(CategoryProductCount::id, CategoryProductCount::name, CategoryProductCount::productCount)
                .containsExactly(
                        tuple(toner.id(), "토너", 2L),
                        tuple(serum.id(), "세럼", 1L));
    }

    @Test
    @DisplayName("제품이 없으면 카테고리를 반환하지 않는다")
    void returnsEmptyCategoriesWithoutProducts() {
        Categories categories = Categories.from(List.of(parent(1L, "스킨케어"), child(2L, 1L, "토너")));
        ProductCountsByCategory productCounts = new ProductCountsByCategory(Map.of());

        assertThat(productCounts.nonEmptyCategoriesOf(categories)).isEmpty();
    }

    @Test
    @DisplayName("전체 카테고리 조회에는 제품이 없는 카테고리도 0과 함께 포함한다")
    void returnsEveryCategoryIncludingEmptyCategories() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category sunCare = parent(3L, "선케어");
        Category sunCream = child(4L, 3L, "선크림");
        Categories categories = Categories.from(List.of(skinCare, toner, sunCare, sunCream));
        ProductCountsByCategory productCounts = new ProductCountsByCategory(Map.of(1L, 1L, 2L, 1L));

        List<CategoryProductCount> countedCategories = productCounts.categoriesOf(categories);

        assertThat(countedCategories)
                .extracting(CategoryProductCount::id, CategoryProductCount::productCount)
                .containsExactly(tuple(1L, 1L), tuple(3L, 0L));
        assertThat(countedCategories.get(1).children())
                .extracting(CategoryProductCount::id, CategoryProductCount::productCount)
                .containsExactly(tuple(4L, 0L));
    }

    private static Category category(Long id) {
        return new Category(id, 1L, "카테고리 " + id, 1);
    }

    private static Category parent(Long id, String name) {
        return new Category(id, null, name, 0);
    }

    private static Category child(Long id, Long parentId, String name) {
        return new Category(id, parentId, name, 1);
    }
}
